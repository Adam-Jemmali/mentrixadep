import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ASSETS = "C:/Users/madat/.cursor/projects/c-Users-madat-Desktop-otams/assets";
const OUT = path.join(process.cwd(), "public", "images", "features");

const MAP = [
  ["c__Users_madat_AppData_Roaming_Cursor_User_workspaceStorage_02daf5ebf7c1cba61efd288a857bc233_images_duel-df79e202-980e-4d4f-941c-67972b5086f1.png", "live-duels.webp"],
  ["c__Users_madat_AppData_Roaming_Cursor_User_workspaceStorage_02daf5ebf7c1cba61efd288a857bc233_images_duels-264d196c-f55a-4d04-8cc8-eaa9bf1fead2.png", "duel-arena.webp"],
  ["c__Users_madat_AppData_Roaming_Cursor_User_workspaceStorage_02daf5ebf7c1cba61efd288a857bc233_images_Quest-42bb8d9b-2eef-4bc7-a1be-bafacbea0fa3.png", "problem-solver.webp"],
  ["c__Users_madat_AppData_Roaming_Cursor_User_workspaceStorage_02daf5ebf7c1cba61efd288a857bc233_images_path-023b2f53-b9e6-4b80-be96-a47751c8d9c9.png", "learning-path.webp"],
  ["c__Users_madat_AppData_Roaming_Cursor_User_workspaceStorage_02daf5ebf7c1cba61efd288a857bc233_images_division-1f5376d3-743e-4548-beeb-7f968f28f6f9.png", "league.webp"],
  ["c__Users_madat_AppData_Roaming_Cursor_User_workspaceStorage_02daf5ebf7c1cba61efd288a857bc233_images_clan-1c64b63f-7e52-4b28-af84-3a4c227aee5e.png", "clan-wars.webp"],
  ["c__Users_madat_AppData_Roaming_Cursor_User_workspaceStorage_02daf5ebf7c1cba61efd288a857bc233_images_session_room_video_call-bf428000-20ba-452b-b3bf-c3406ddfbe9c.png", "session-room.webp"],
  ["c__Users_madat_AppData_Roaming_Cursor_User_workspaceStorage_02daf5ebf7c1cba61efd288a857bc233_images_packagespostcall-45306dc9-2e37-45bf-9c19-4f19f378fe94.png", "study-package.webp"],
  ["c__Users_madat_AppData_Roaming_Cursor_User_workspaceStorage_02daf5ebf7c1cba61efd288a857bc233_images_packagepostc-693b916d-58a0-4618-858c-64a1d5f19ebc.png", "studio-output.webp"],
  ["c__Users_madat_AppData_Roaming_Cursor_User_workspaceStorage_02daf5ebf7c1cba61efd288a857bc233_images_tutorprofilecourses-8150aacc-6676-460a-af64-5452f6276306.png", "guide-knowledge.webp"],
  ["c__Users_madat_AppData_Roaming_Cursor_User_workspaceStorage_02daf5ebf7c1cba61efd288a857bc233_images_paymentstutor-66de5175-e919-44fe-8ce9-13815054d0fe.png", "payouts.webp"],
];

await mkdir(OUT, { recursive: true });

for (const [srcName, outName] of MAP) {
  const input = path.join(ASSETS, srcName);
  const output = path.join(OUT, outName);
  const info = await sharp(input)
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 72, effort: 4 })
    .toFile(output);
  console.log(`${outName}: ${Math.round(info.size / 1024)} KB (${info.width}x${info.height})`);
}
