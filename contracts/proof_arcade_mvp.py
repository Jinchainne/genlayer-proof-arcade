# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


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
                "start_time": int(start_time),
                "lock_time": int(lock_time),
                "end_time": int(end_time),
                "status": "open",
                "winning_choice": "",
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

        winning_choice = ""
        winning_points = -1

        for choice in round_data["choices"]:
            pool_value = self.round_pools.get(f"{round_id}:{choice}") or 0
            if pool_value > winning_points:
                winning_points = pool_value
                winning_choice = choice

        round_data["status"] = "resolved"
        round_data["winning_choice"] = winning_choice
        round_data["evidence_summary"] = (
            f"MVP resolution selected '{winning_choice}' from the strongest position pool. "
            f"Rules snapshot: {round_data['resolution_rules']}"
        )
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
