-- ============================================================
-- 019a_seed_person_skills (remote: 20260614073226)
-- Seed initial : 75 compétences sur 15 personnes (collaborateurs)
-- source='inference_ia', confidence∈{0.2,0.4,0.6,0.8,1.0}
-- ON CONFLICT idempotent (re-run safe)
-- ============================================================

INSERT INTO public.person_skills (person_id, skill_id, level, years, last_used_year, source, confidence)
VALUES
  -- person 29dafafd (5 skills)
  ('29dafafd-7e3c-4727-b023-1732ee4362b5','37c1118e-a533-476b-847f-f882b7f677a9', 3,  4, 2026,'inference_ia', 0.60),
  ('29dafafd-7e3c-4727-b023-1732ee4362b5','516b1cfa-f382-4504-9e00-9317ebd852b2', 2,  2, 2026,'inference_ia', 0.40),
  ('29dafafd-7e3c-4727-b023-1732ee4362b5','8e94cf28-2336-4dfb-b435-45a8fb893ea2', 4,  7, 2026,'inference_ia', 0.80),
  ('29dafafd-7e3c-4727-b023-1732ee4362b5','a908ad6f-6dc8-40cd-aab6-f641459e1f2b', 2,  2, 2026,'inference_ia', 0.40),
  ('29dafafd-7e3c-4727-b023-1732ee4362b5','b6b1e51b-825b-4fea-a882-09a015c56b61', 4,  7, 2026,'inference_ia', 0.80),
  -- person 3167b065 (5 skills)
  ('3167b065-6635-42bf-bb4c-0af4f40c409a','27382e98-6458-45dc-9a2a-daad6467ba94', 4,  7, 2026,'inference_ia', 0.80),
  ('3167b065-6635-42bf-bb4c-0af4f40c409a','30a6f9cc-fa52-46a3-8c4d-8c0c19b474ad', 4,  7, 2026,'inference_ia', 0.80),
  ('3167b065-6635-42bf-bb4c-0af4f40c409a','37c1118e-a533-476b-847f-f882b7f677a9', 3,  4, 2026,'inference_ia', 0.60),
  ('3167b065-6635-42bf-bb4c-0af4f40c409a','60dde2a5-e53d-4669-bd6e-28c1d3e80430', 3,  4, 2026,'inference_ia', 0.60),
  ('3167b065-6635-42bf-bb4c-0af4f40c409a','fa4aba83-6931-4eb1-b078-f6eeab09f531', 4,  7, 2026,'inference_ia', 0.80),
  -- person 41c9ab6c (4 skills)
  ('41c9ab6c-389b-492a-8c68-d218f94dc208','318df965-7e82-4c3d-8e49-588cb2f3b650', 3,  4, 2026,'inference_ia', 0.60),
  ('41c9ab6c-389b-492a-8c68-d218f94dc208','95e5954d-46c7-4957-8822-c019e8181801', 4,  7, 2026,'inference_ia', 0.80),
  ('41c9ab6c-389b-492a-8c68-d218f94dc208','9e6d2a79-c098-4f86-aead-f2792c73e137', 4,  7, 2026,'inference_ia', 0.80),
  ('41c9ab6c-389b-492a-8c68-d218f94dc208','e4b58c6b-678a-4f2c-8618-d596ded0c2b7', 3,  4, 2026,'inference_ia', 0.60),
  -- person 7d0c4623 (5 skills)
  ('7d0c4623-46d5-4ef1-bf04-111440513c74','37c1118e-a533-476b-847f-f882b7f677a9', 5, 10, 2026,'inference_ia', 1.00),
  ('7d0c4623-46d5-4ef1-bf04-111440513c74','451f216d-e0da-4927-869d-6097e0d5dabf', 4,  7, 2026,'inference_ia', 0.80),
  ('7d0c4623-46d5-4ef1-bf04-111440513c74','5744c7f7-acf8-409f-97b7-2dca13211024', 4,  7, 2026,'inference_ia', 0.80),
  ('7d0c4623-46d5-4ef1-bf04-111440513c74','d91fdbac-6f11-4bb5-8b5c-0fe3027d345f', 3,  4, 2026,'inference_ia', 0.60),
  ('7d0c4623-46d5-4ef1-bf04-111440513c74','fa4aba83-6931-4eb1-b078-f6eeab09f531', 4,  7, 2026,'inference_ia', 0.80),
  -- person 80999eee (5 skills)
  ('80999eee-dff0-4b21-86b9-15e4d7d3036f','55b57413-e93b-4700-b0b8-7b45943d00a3', 3,  4, 2026,'inference_ia', 0.60),
  ('80999eee-dff0-4b21-86b9-15e4d7d3036f','6c09ec39-363e-4945-aeaa-6470bd75ea0b', 5, 10, 2026,'inference_ia', 1.00),
  ('80999eee-dff0-4b21-86b9-15e4d7d3036f','7b352572-b941-44a8-99d9-6f852cfbe063', 5, 10, 2026,'inference_ia', 1.00),
  ('80999eee-dff0-4b21-86b9-15e4d7d3036f','9ed2f83b-404a-4262-8367-45825cab5e3e', 2,  2, 2026,'inference_ia', 0.40),
  ('80999eee-dff0-4b21-86b9-15e4d7d3036f','a6157eec-93d9-4146-afdb-d3156c6ac6a2', 5, 10, 2026,'inference_ia', 1.00),
  -- person 8f1e21b2 (4 skills)
  ('8f1e21b2-f7a9-4db7-b25b-bff0ebdd723e','24a7d647-bf32-4bd8-845b-e6216c6ded2f', 4,  7, 2026,'inference_ia', 0.80),
  ('8f1e21b2-f7a9-4db7-b25b-bff0ebdd723e','532f4e90-5838-45a1-a197-c58222a4f2f3', 4,  7, 2026,'inference_ia', 0.80),
  ('8f1e21b2-f7a9-4db7-b25b-bff0ebdd723e','66ad3ff4-c6de-4c67-b6af-85641ebea94f', 3,  4, 2026,'inference_ia', 0.60),
  ('8f1e21b2-f7a9-4db7-b25b-bff0ebdd723e','d1672bbb-40d0-4d8d-a81f-0fe1cdc4ca76', 3,  4, 2026,'inference_ia', 0.60),
  -- person 9380c2d5 (5 skills)
  ('9380c2d5-f508-4e7a-820d-8baf7702b6df','06cee7b2-1ab6-4591-a7e7-a93eddededdf', 5, 10, 2026,'inference_ia', 1.00),
  ('9380c2d5-f508-4e7a-820d-8baf7702b6df','816bd54a-676d-4dbc-aa0f-bcb609bd6c0a', 4,  7, 2026,'inference_ia', 0.80),
  ('9380c2d5-f508-4e7a-820d-8baf7702b6df','87aec773-4c3b-4b64-89e9-76622fa471b9', 4,  7, 2026,'inference_ia', 0.80),
  ('9380c2d5-f508-4e7a-820d-8baf7702b6df','9e6d2a79-c098-4f86-aead-f2792c73e137', 4,  7, 2026,'inference_ia', 0.80),
  ('9380c2d5-f508-4e7a-820d-8baf7702b6df','c3bbbd48-42d4-4268-a161-debd1313039c', 4,  7, 2026,'inference_ia', 0.80),
  -- person 99c05b00 (5 skills)
  ('99c05b00-415d-48b0-8db6-ea9b077626ea','1a0010fa-eda1-4693-853a-1c06d3b12d58', 3,  4, 2026,'inference_ia', 0.60),
  ('99c05b00-415d-48b0-8db6-ea9b077626ea','22d522eb-4e2c-42d1-9f85-1e4566dde1f0', 4,  7, 2026,'inference_ia', 0.80),
  ('99c05b00-415d-48b0-8db6-ea9b077626ea','7dc2c478-e2ad-44eb-8b24-c7399226cbc8', 4,  7, 2026,'inference_ia', 0.80),
  ('99c05b00-415d-48b0-8db6-ea9b077626ea','8b373c7f-e4d6-4d40-807c-053157d984ff', 4,  7, 2026,'inference_ia', 0.80),
  ('99c05b00-415d-48b0-8db6-ea9b077626ea','d0199c02-321b-42ac-af78-48f423219e4f', 3,  4, 2026,'inference_ia', 0.60),
  -- person b177aa04 (5 skills)
  ('b177aa04-10d2-4d9f-a71c-12b51374209d','574d4df7-9d54-42cb-8874-33e577f5d68a', 4,  7, 2026,'inference_ia', 0.80),
  ('b177aa04-10d2-4d9f-a71c-12b51374209d','6c09ec39-363e-4945-aeaa-6470bd75ea0b', 4,  7, 2026,'inference_ia', 0.80),
  ('b177aa04-10d2-4d9f-a71c-12b51374209d','7b352572-b941-44a8-99d9-6f852cfbe063', 3,  4, 2026,'inference_ia', 0.60),
  ('b177aa04-10d2-4d9f-a71c-12b51374209d','8d7110b9-4468-4597-85b8-7f3a6d3debc8', 4,  7, 2026,'inference_ia', 0.80),
  ('b177aa04-10d2-4d9f-a71c-12b51374209d','ff8ed2ed-5e10-4740-a5a8-003c581f672c', 4,  7, 2026,'inference_ia', 0.80),
  -- person b4025125 (4 skills)
  ('b4025125-2efb-40e0-a064-57774bee204b','37c1118e-a533-476b-847f-f882b7f677a9', 2,  2, 2026,'inference_ia', 0.40),
  ('b4025125-2efb-40e0-a064-57774bee204b','4e851263-0866-4f83-90bf-e35d1271c657', 2,  2, 2026,'inference_ia', 0.40),
  ('b4025125-2efb-40e0-a064-57774bee204b','ae81820c-9f8b-4e05-93fb-f6a76fbfbcbf', 3,  4, 2026,'inference_ia', 0.60),
  ('b4025125-2efb-40e0-a064-57774bee204b','fa4aba83-6931-4eb1-b078-f6eeab09f531', 1,  1, 2026,'inference_ia', 0.20),
  -- person b5dab2d0 (5 skills)
  ('b5dab2d0-c44b-4e83-9b2f-a3627b545bf1','0548981f-e568-4099-b591-fed8a527c25d', 4,  7, 2026,'inference_ia', 0.80),
  ('b5dab2d0-c44b-4e83-9b2f-a3627b545bf1','20774b8c-374a-497e-af89-2f50220f6998', 3,  4, 2026,'inference_ia', 0.60),
  ('b5dab2d0-c44b-4e83-9b2f-a3627b545bf1','516b1cfa-f382-4504-9e00-9317ebd852b2', 5, 10, 2026,'inference_ia', 1.00),
  ('b5dab2d0-c44b-4e83-9b2f-a3627b545bf1','8b373c7f-e4d6-4d40-807c-053157d984ff', 4,  7, 2026,'inference_ia', 0.80),
  ('b5dab2d0-c44b-4e83-9b2f-a3627b545bf1','c3ce3b7f-09de-4a92-ac70-49fde6c2d163', 3,  4, 2026,'inference_ia', 0.60),
  -- person c3fd949f (4 skills)
  ('c3fd949f-831c-4a7f-adb5-b83ebd99a329','06cee7b2-1ab6-4591-a7e7-a93eddededdf', 3,  4, 2026,'inference_ia', 0.60),
  ('c3fd949f-831c-4a7f-adb5-b83ebd99a329','1684562f-55ae-46af-95ad-6dfd9e9d5160', 3,  4, 2026,'inference_ia', 0.60),
  ('c3fd949f-831c-4a7f-adb5-b83ebd99a329','539210b9-7ec7-4dd0-a57a-e6af0e6d42a2', 3,  4, 2026,'inference_ia', 0.60),
  ('c3fd949f-831c-4a7f-adb5-b83ebd99a329','ae81820c-9f8b-4e05-93fb-f6a76fbfbcbf', 3,  4, 2026,'inference_ia', 0.60),
  -- person c691cf40 (4 skills)
  ('c691cf40-902c-4ce5-bcb4-c4bc2a82afb9','34f77219-2128-49ea-9462-9d03903d5b06', 4,  7, 2026,'inference_ia', 0.80),
  ('c691cf40-902c-4ce5-bcb4-c4bc2a82afb9','46a362dd-d6fc-4e13-9ece-84331e196fc1', 2,  2, 2026,'inference_ia', 0.40),
  ('c691cf40-902c-4ce5-bcb4-c4bc2a82afb9','a449e185-b725-42f1-a62f-3aa3e8f2212f', 3,  4, 2026,'inference_ia', 0.60),
  ('c691cf40-902c-4ce5-bcb4-c4bc2a82afb9','b5179728-1e8c-42ff-9237-a29f013259ef', 3,  4, 2026,'inference_ia', 0.60),
  -- person d359d7dd (5 skills)
  ('d359d7dd-9fcb-4c72-9fc8-ad7ad911b706','37c1118e-a533-476b-847f-f882b7f677a9', 3,  4, 2026,'inference_ia', 0.60),
  ('d359d7dd-9fcb-4c72-9fc8-ad7ad911b706','5d37ca29-de94-49b5-85d7-3265c05986c7', 5, 10, 2026,'inference_ia', 1.00),
  ('d359d7dd-9fcb-4c72-9fc8-ad7ad911b706','97356463-2bbc-4c13-abe7-eae463cbe564', 3,  4, 2026,'inference_ia', 0.60),
  ('d359d7dd-9fcb-4c72-9fc8-ad7ad911b706','cd906948-5c5d-4642-a590-95891f17c7a5', 2,  2, 2026,'inference_ia', 0.40),
  ('d359d7dd-9fcb-4c72-9fc8-ad7ad911b706','ff734dfe-f8d2-4283-9c1a-c6a631be1e21', 3,  4, 2026,'inference_ia', 0.60),
  -- person debc8020 (5 skills)
  ('debc8020-1220-457a-9f19-fbdf046679df','05a87b80-9eb5-44be-b6c5-fb1e28efe029', 3,  4, 2026,'inference_ia', 0.60),
  ('debc8020-1220-457a-9f19-fbdf046679df','9aa6379c-df66-4740-93be-f4ad731302aa', 4,  7, 2026,'inference_ia', 0.80),
  ('debc8020-1220-457a-9f19-fbdf046679df','afc6656e-9eba-45ab-b314-5f2dfcd96081', 5, 10, 2026,'inference_ia', 1.00),
  ('debc8020-1220-457a-9f19-fbdf046679df','c624d386-6a0f-41ec-aa52-b0636e45bfa5', 4,  7, 2026,'inference_ia', 0.80),
  ('debc8020-1220-457a-9f19-fbdf046679df','c7eef783-24f0-401a-938c-3a30c52b21d4', 4,  7, 2026,'inference_ia', 0.80),
  -- person f7ed5221 (5 skills)
  ('f7ed5221-5575-4788-8411-fc430ebb00e0','22244047-59ae-4d97-b47e-fce7e8c01330', 4,  7, 2026,'inference_ia', 0.80),
  ('f7ed5221-5575-4788-8411-fc430ebb00e0','2c8b45bb-b19f-4f3f-a730-f348bbdf2dca', 4,  7, 2026,'inference_ia', 0.80),
  ('f7ed5221-5575-4788-8411-fc430ebb00e0','4ef1d4cc-fb57-4907-86b1-cba35c7fc100', 4,  7, 2026,'inference_ia', 0.80),
  ('f7ed5221-5575-4788-8411-fc430ebb00e0','66ad3ff4-c6de-4c67-b6af-85641ebea94f', 3,  4, 2026,'inference_ia', 0.60),
  ('f7ed5221-5575-4788-8411-fc430ebb00e0','d1672bbb-40d0-4d8d-a81f-0fe1cdc4ca76', 3,  4, 2026,'inference_ia', 0.60)
ON CONFLICT (person_id, skill_id) DO NOTHING;
