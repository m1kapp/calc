#!/usr/bin/env node
// src/phrases.ts 의 문장을 나라별 원어민 음성으로 구워 public/greet/<통화>/<번호>.mp3 에 쓴다.
// Microsoft Edge 신경망 음성(python edge_tts, `pip install edge-tts`). 사용: node --experimental-strip-types scripts/greet.mjs
import { execFileSync } from "node:child_process";
import { phrases, VOICE } from "../src/phrases.ts";

const jobs = Object.keys(VOICE).flatMap((code) =>
  phrases(code).map(([text], i) => ({ text, voice: VOICE[code][2], out: `public/greet/${code.toLowerCase()}/${i}.mp3` })));
execFileSync("python3", ["-c", `
import asyncio, json, os, sys, edge_tts
jobs = json.load(sys.stdin)
async def one(j, sem):
    os.makedirs(os.path.dirname(j["out"]), exist_ok=True)
    if os.path.exists(j["out"]) and os.path.getsize(j["out"]): return  # 이미 구운 건 둔다 — 문장을 고쳤으면 그 파일을 지우고 돌린다
    async with sem:
        for _ in range(3):  # 가끔 한 번씩 끊긴다(태국어에서 겪음)
            try: return await edge_tts.Communicate(j["text"], j["voice"]).save(j["out"])
            except Exception as e: err = e
        print("실패", j["out"], err)
async def main():
    sem = asyncio.Semaphore(8)  # 루프 안에서 만든다(python 3.9)
    await asyncio.gather(*(one(j, sem) for j in jobs))
asyncio.run(main())
`], { input: JSON.stringify(jobs), stdio: ["pipe", "inherit", "inherit"] });
console.log(`${jobs.length}개 → public/greet/`);
