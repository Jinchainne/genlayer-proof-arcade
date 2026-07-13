# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import typing


class ProofArcadeMVP(gl.Contract):
    next_round_id: u256
    next_position_id: u256
    rounds: TreeMap[u256, str]
    positions: TreeMap[u256, str]
    round_pools: TreeMap[str, u256]
    claims: TreeMap[str, bool]

    def __init__(self):
        self.next_round_id = 1
        self.next_position_id = 1

    @gl.public.write
    def create_round(
        self,
        question: str,
        choices: list[str],
        resolution_rules: str,
        evidence_urls: list[str],
        start_time: u256,
        lock_time: u256,
        end_time: u256,
    ) -> u256:
        round_id = self.next_round_id
        self.rounds[round_id] = json.dumps(
            {
                "round_id": int(round_id),
                "question": question,
                "choices": choices,
                "resolution_rules": resolution_rules,
                "evidence_urls": evidence_urls,
                "start_time": int(start_time),
                "lock_time": int(lock_time),
                "end_time": int(end_time),
                "status": "open",
                "winning_choice": "",
                "confidence": 0,
                "evidence_summary": "Round created on GenLayer MVP contract.",
            }
        )
        self.next_round_id = round_id + 1
        return round_id

    @gl.public.write
    def enter_round(self, round_id: u256, choice: str, points: u256):
        round_payload = self.rounds.get(round_id)
        if not round_payload:
            raise gl.vm.UserError("Round not found")

        round_data = json.loads(round_payload)
        if round_data["status"] != "open":
            raise gl.vm.UserError("Round is not open")
        if choice not in round_data["choices"]:
            raise gl.vm.UserError("Choice is not valid for this round")
        if points <= 0:
            raise gl.vm.UserError("Points must be positive")

        position_id = self.next_position_id
        position_key = f"{round_id}:{choice}"
        existing_pool = self.round_pools.get(position_key) or 0

        self.positions[position_id] = json.dumps(
            {
                "position_id": int(position_id),
                "round_id": int(round_id),
                "player": str(gl.message.sender_address),
                "choice": choice,
                "points": int(points),
                "status": "pending",
            }
        )
        self.round_pools[position_key] = existing_pool + points
        self.next_position_id = position_id + 1

    @gl.public.write
    def resolve_round(self, round_id: u256):
        round_payload = self.rounds.get(round_id)
        if not round_payload:
            raise gl.vm.UserError("Round not found")

        round_data = json.loads(round_payload)
        if round_data["status"] == "resolved":
            return

        adjudication = self._adjudicate_round(round_data)

        round_data["status"] = "resolved"
        round_data["winning_choice"] = adjudication["winning_choice"]
        round_data["confidence"] = adjudication["confidence"]
        round_data["evidence_summary"] = adjudication["evidence_summary"]
        self.rounds[round_id] = json.dumps(round_data)

    @gl.public.write
    def claim_reward(self, round_id: u256):
        round_payload = self.rounds.get(round_id)
        if not round_payload:
            raise gl.vm.UserError("Round not found")

        round_data = json.loads(round_payload)
        if round_data["status"] != "resolved":
            raise gl.vm.UserError("Round is not resolved")

        claim_key = f"{round_id}:{str(gl.message.sender_address)}"
        self.claims[claim_key] = True

    @gl.public.view
    def get_round(self, round_id: u256) -> str:
        return self.rounds.get(round_id) or ""

    @gl.public.view
    def get_position(self, position_id: u256) -> str:
        return self.positions.get(position_id) or ""

    @gl.public.view
    def get_round_pool(self, round_id: u256, choice: str) -> u256:
        return self.round_pools.get(f"{round_id}:{choice}") or 0

    @gl.public.view
    def get_latest_round_id(self) -> u256:
        return self.next_round_id - 1

    def _adjudicate_round(self, round_data: dict[str, typing.Any]) -> dict[str, typing.Any]:
        def leader_fn() -> dict[str, typing.Any]:
            return self._run_adjudication(round_data)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False

            try:
                leader_decision = leader_result.calldata
                validator_decision = self._run_adjudication(round_data)
            except Exception:
                return False

            same_choice = leader_decision.get("winning_choice") == validator_decision.get("winning_choice")
            confidence_gap = abs(
                int(leader_decision.get("confidence", 0)) - int(validator_decision.get("confidence", 0))
            )
            return same_choice and confidence_gap <= 25

        verdict = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        if verdict.get("winning_choice") not in round_data["choices"]:
            raise gl.vm.UserError("GenLayer adjudication returned a choice outside the market")

        return {
            "winning_choice": verdict["winning_choice"],
            "confidence": int(verdict.get("confidence", 0)),
            "evidence_summary": str(verdict.get("evidence_summary", "No evidence summary returned.")),
        }

    def _run_adjudication(self, round_data: dict[str, typing.Any]) -> dict[str, typing.Any]:
        evidence_bundle = self._fetch_evidence_bundle(round_data.get("evidence_urls", []))
        prompt = self._build_resolution_prompt(
            round_data["question"],
            round_data["choices"],
            round_data["resolution_rules"],
            evidence_bundle,
        )
        raw_response = gl.nondet.exec_prompt(prompt, response_format="json")
        return self._normalize_verdict(raw_response, round_data["choices"])

    def _fetch_evidence_bundle(self, evidence_urls: list[str]) -> str:
        snippets: list[str] = []

        for raw_url in evidence_urls[:3]:
            url = str(raw_url).strip()
            if not url:
                continue

            compact = self._fetch_evidence_text(url)
            snippets.append(f"URL: {url}\nCONTENT: {compact[:1400]}")

        if not snippets:
            return "No external evidence URLs were supplied for this round."
        return "\n\n".join(snippets)

    def _fetch_evidence_text(self, url: str) -> str:
        dynamic_hosts = [
            "github.com",
            "cointelegraph.com",
            "coindesk.com",
            "ustr.gov",
        ]

        if any(host in url for host in dynamic_hosts):
            rendered = gl.nondet.web.render(url, mode="text", wait_after_loaded="3s")
            return " ".join(str(rendered).split())

        response = gl.nondet.web.get(url)
        body = response.body.decode("utf-8", errors="ignore")
        return " ".join(body.split())

    def _build_resolution_prompt(
        self,
        question: str,
        choices: list[str],
        resolution_rules: str,
        evidence_bundle: str,
    ) -> str:
        choices_json = json.dumps(choices)
        return (
            "You are resolving a prediction market on GenLayer.\n"
            f"Question: {question}\n"
            f"Allowed choices: {choices_json}\n"
            f"Resolution rules: {resolution_rules}\n"
            "Evidence bundle follows.\n"
            f"{evidence_bundle}\n\n"
            "Decide the single best winning_choice using the public evidence. "
            "Respond with compact JSON only using this schema: "
            '{"winning_choice":"<one allowed choice>","confidence":0-100,"evidence_summary":"short explanation"}'
        )

    def _normalize_verdict(
        self,
        raw_response: typing.Any,
        choices: list[str],
    ) -> dict[str, typing.Any]:
        parsed = raw_response
        if isinstance(raw_response, str):
            response_text = raw_response.strip()
            start = response_text.find("{")
            end = response_text.rfind("}")
            if start != -1 and end != -1 and end >= start:
                response_text = response_text[start : end + 1]
            parsed = json.loads(response_text)

        if not isinstance(parsed, dict):
            raise Exception("adjudication response must be a JSON object")

        winning_choice = str(parsed.get("winning_choice", "")).strip()
        if winning_choice not in choices:
            raise Exception("winning_choice is not one of the allowed choices")

        confidence_value = parsed.get("confidence", 0)
        confidence = int(confidence_value)
        if confidence < 0:
            confidence = 0
        if confidence > 100:
            confidence = 100

        evidence_summary = str(parsed.get("evidence_summary", "")).strip()
        if not evidence_summary:
            evidence_summary = "Consensus reached from the supplied public evidence."

        return {
            "winning_choice": winning_choice,
            "confidence": confidence,
            "evidence_summary": evidence_summary[:280],
        }
