import { createClient } from "@supabase/supabase-js"

const PROSPECTS_DATA = [
  {"id":"dc5f1670-0bd8-4088-ba97-6c9016f65a53","company_name":"Aromatech Group","segment":"Arômes","revenue":"31 M€","employee_count":"170"},
  {"id":"8513d404-24e6-471b-a473-7ce13bd7bec3","company_name":"Eurecom","segment":"Privé","revenue":"8,7M€","employee_count":"106"},
  {"id":"aff059e6-8b2b-4cab-a51b-a5322dc68ba0","company_name":"Malongo","segment":"Producteur café","revenue":"127M€","employee_count":"301"},
  {"id":"338dbe53-4bcf-4d65-892d-d20b21cc44a9","company_name":"Ascoma","segment":"Assurance","revenue":"300M€","employee_count":"700"},
  {"id":"e78af454-26b5-4cdd-ae78-1c5c711fd6da","company_name":"Ansys","segment":"Editeur de logiciels","revenue":"2,3 Mds $","employee_count":"5000"},
  {"id":"51789a67-16d6-43e7-ade5-05b14f6b5416","company_name":"CHU de Nice","segment":"Santé publique","revenue":"800M€","employee_count":"9500"},
  {"id":"27c97212-ecd9-4043-a403-7bc2cbce55fc","company_name":"European Society Of Cardiology","segment":"Santé privée","revenue":null,"employee_count":null},
  {"id":"96f768b1-9fcc-4710-aa4c-c84d1d121211","company_name":"Groupe Ippolito","segment":"Automobile","revenue":"299M€","employee_count":"900"},
  {"id":"aca9e5a3-6d3f-400e-bd63-0abe05355a6b","company_name":"CODIX","segment":"Editeur de logiciels","revenue":"36M€","employee_count":"38"},
  {"id":"90df1bb5-391e-4f9d-b010-652ebac67dc4","company_name":"Expressions Parfumees","segment":"Arômes","revenue":"108M€","employee_count":"234"},
  {"id":"54f4ef6a-ae25-4cd1-8b94-26e95dfa9feb","company_name":"Groupe Arthes","segment":"Arômes","revenue":"27M€","employee_count":"130"},
  {"id":"faab9fe5-eafd-47d7-a3b6-444cbafb3db3","company_name":"Euro Protection Surveillance","segment":"Sécurité","revenue":"269M€","employee_count":"976"},
  {"id":"50c7298b-3e1a-41d0-821e-7c2e9dfee92e","company_name":"Lbm Bioesterel","segment":"Pharmaceutique","revenue":"1,6Mds€ (Biogroup)","employee_count":"800"},
  {"id":"31daad78-d1f4-4214-a387-4621c59308fa","company_name":"Aéroport Nice Cote d Azur","segment":"Transport","revenue":"311M€","employee_count":"700"},
  {"id":"0c01b56e-7e56-43c9-933b-bc4e8d7bae3d","company_name":"Keller Williams France","segment":"Immobilier","revenue":"5M€/centre","employee_count":"36 (France)"},
  {"id":"78af90a6-814c-4ff6-9dcc-4d1cf083ee66","company_name":"Domusvi","segment":"Structures médicalisées","revenue":"2,2 Mds €","employee_count":"38k"},
  {"id":"fe07ac45-c7ad-4f28-b269-fa5b14ab717d","company_name":"Vulog","segment":"Editeur de logiciels","revenue":null,"employee_count":null},
  {"id":"3a001f07-2873-48af-afc0-79d865973600","company_name":"Bioceanor","segment":"IoT","revenue":null,"employee_count":null},
  {"id":"54a098ea-985c-4e3c-80e7-63120ae56a0a","company_name":"Autogrill","segment":"Restaurants","revenue":null,"employee_count":null},
  {"id":"6be376aa-c9a7-41ef-9f77-d759f7f12bc4","company_name":"Naphtachimie","segment":"Pharmaceutique","revenue":null,"employee_count":null},
  {"id":"5254e6a9-e717-44e9-bdf7-cb6d25356b32","company_name":"Renaudi","segment":"Construction","revenue":"1,4M€","employee_count":"3"},
  {"id":"1454c24b-9947-43da-914c-ad33b465c4a9","company_name":"Odalys Group","segment":"Voyage & Séjours","revenue":"264 M€","employee_count":"1700"},
  {"id":"81e91e38-7e35-4e3b-9bae-880060ddad4a","company_name":"Petroineos","segment":"Raffinage","revenue":"658M€","employee_count":"700"},
  {"id":"53d6edab-038a-4adf-9b12-cf34c3c03f2f","company_name":"Bourbon Offshore","segment":"Armateur","revenue":"733M€","employee_count":"5800"},
  {"id":"e5f8fd19-7433-4e44-b759-400f4256545d","company_name":"Voyage Privé","segment":"Voyage & Séjours","revenue":"744 M€","employee_count":"400"},
  {"id":"b8ad688f-1597-40b5-9c1d-d7ae7fb6808e","company_name":"SOS Oxygene","segment":"Dispositifs médicaux","revenue":"578M€","employee_count":"2700"},
  {"id":"829c374a-d347-4778-bec7-4d7195be09db","company_name":"Skema Business School","segment":"Enseignement supérieur privé","revenue":"7M€","employee_count":"190"},
  {"id":"658b2668-d787-43a1-b3ee-bf0e61ef6401","company_name":"Depil Tech","segment":"Cosmétiques","revenue":"5,8M€","employee_count":"300 (franchisés)"},
  {"id":"cde3d719-f1ef-4bd5-a55d-1f37c7642637","company_name":"Tournaire","segment":"Emballages industriels","revenue":"270M€","employee_count":"70"},
  {"id":"97278ff4-ff64-4406-9ff2-0bc73c947355","company_name":"Groupe IDEC","segment":"Construction & Promotion","revenue":"500M€","employee_count":"620"},
  {"id":"53eff06d-edab-45c9-8af7-4994e092d3de","company_name":"Polytech Nice Sophia","segment":"Privé","revenue":null,"employee_count":null},
  {"id":"36dbcb0f-c7d1-4872-b895-3b66454d0c1f","company_name":"CNRS Geoazur","segment":"Recherche","revenue":"","employee_count":"650"},
  {"id":"f6b1094f-c553-4688-acf5-35510729ad83","company_name":"Préfecture 06","segment":"Administration","revenue":"","employee_count":""},
  {"id":"26fccb7d-5bde-4238-b751-48779f4c0c6f","company_name":"Groupe Transcan","segment":"Logistique","revenue":null,"employee_count":null},
  {"id":"67b346ff-68c8-4f36-a510-13024955856f","company_name":"Robertet","segment":"Arômes","revenue":"844M€","employee_count":"2400"},
  {"id":"99dc211b-4f85-44a7-85ed-944dd2695b45","company_name":"Cogepart","segment":"Logistique","revenue":"210M€","employee_count":"3300"},
  {"id":"c58cdc3d-c3db-4af0-b19a-b8e448fa2c5d","company_name":"Median Technologies","segment":"Editeur de logiciels (santé)","revenue":"23,5 M€","employee_count":"200"},
  {"id":"d1856994-279e-4a8b-b14e-9be50cf94670","company_name":"Payan Bertrand","segment":"Arômes","revenue":"24 M€","employee_count":"110"},
  {"id":"4ca75ded-6adb-417f-a1ff-2e456072d134","company_name":"Richardson","segment":"Salle de bain & plomberie","revenue":"652M€","employee_count":"2080"},
  {"id":"2b5cda03-4377-4cc3-ae5c-426d1f09e7bb","company_name":"Solimut","segment":"Mutuelle","revenue":"320 M€","employee_count":"450"},
  {"id":"6f890515-b743-4fe0-bdf5-4c7790fef746","company_name":"Schneider","segment":"Electronique","revenue":null,"employee_count":null},
  {"id":"63395e3f-350a-424e-a7bc-d27db2a876b4","company_name":"Horus Pharma","segment":"Pharma/santé","revenue":"93M€","employee_count":"230"},
  {"id":"02a3f1df-8d5e-4c35-acce-4190bdbfe02e","company_name":"CNRS Institut de la mer de Villefranche","segment":"Recherche","revenue":"","employee_count":"180"},
  {"id":"1ff83806-3d98-4f95-8b0e-92d9d38dc004","company_name":"MP SA (AVATACAR)","segment":"Automobile","revenue":"","employee_count":""},
  {"id":"1f3f1dd2-5f67-4509-943e-6e00d4e77ba6","company_name":"Seqoia soft","segment":"Editeur de logiciels","revenue":"40M€","employee_count":"400"},
  {"id":"eed2a413-f55f-42c5-a77d-4a6bf93bddd5","company_name":"Geostock","segment":"Stockage","revenue":"","employee_count":""},
  {"id":"e9c1a061-d27d-4979-b575-3cb7cbb14b2c","company_name":"CASA (Communauté d agglomérations)","segment":"Administration","revenue":"","employee_count":""},
  {"id":"2ea63e2c-346a-4f98-810f-d2ea252206f0","company_name":"Audemard","segment":"Construction","revenue":"240 M€","employee_count":"200"},
  {"id":"1a72a43f-3db5-482c-bb0b-077196321458","company_name":"STMicroelectronics","segment":"Electronique","revenue":"3,3 Mds€","employee_count":"5684"},
  {"id":"850594ce-e4b4-470b-83ea-40e07893ee9d","company_name":"Retif","segment":"Meubles et électroménager","revenue":"121M€","employee_count":""},
  {"id":"2e162a68-7c89-4aba-997f-aea529e30853","company_name":"CCI Cote d Azur","segment":"Administration","revenue":"","employee_count":""},
  {"id":"618d64ec-e377-46aa-8fb1-730990b71a02","company_name":"Rectorat de Nice","segment":"Administration","revenue":null,"employee_count":null},
  {"id":"00a54430-f85d-4a6d-866d-d6e7c8034853","company_name":"Banque Populaire Mediterranée","segment":"Banque & Assurance","revenue":"","employee_count":""},
  {"id":"bea505e9-3506-4ed1-aab0-54740ba42c5b","company_name":"Les Mutuelles du Soleil","segment":"Mutuelle","revenue":null,"employee_count":null},
  {"id":"8de1ba98-d33b-4c10-83bc-a64edeada740","company_name":"Nice Matin","segment":"Presse","revenue":"80M€","employee_count":"800"},
  {"id":"544f9112-893c-4e1f-92f0-658aa308f458","company_name":"PARFEX","segment":"Arômes","revenue":"38M€","employee_count":"118"},
  {"id":"16dc1cd4-b697-4914-8f98-e9a3c60cb9a2","company_name":"Pizzorno Environnement","segment":"Environnement","revenue":"115 M€","employee_count":""},
  {"id":"a53c8a59-89a1-4b3e-a653-87b8259d634e","company_name":"UNAPEI PACA","segment":"Structures médicalisées","revenue":null,"employee_count":null},
  {"id":"cf0c393a-adbe-4564-b70a-78355a56f0a0","company_name":"Exail Robotics","segment":"Défense","revenue":"373","employee_count":"2000"},
  {"id":"d11d2be3-5d71-4d79-b8e5-4b1a648b519a","company_name":"Emera","segment":"Structures médicalisées","revenue":"230M€","employee_count":"7500"},
  {"id":"0bd5d255-4c6b-4612-8cea-02ea888b41cd","company_name":"Régie ligne d azur","segment":"Transport","revenue":"","employee_count":"1500"},
  {"id":"391b5559-03ce-4168-b417-e93832a8d5ef","company_name":"Giraudi","segment":"Commerce de viandes","revenue":"100M€","employee_count":""},
  {"id":"00306233-3862-4dc9-b05b-ae83cb392f4b","company_name":"Torbel Industrie","segment":"Ferronnier","revenue":"","employee_count":""},
  {"id":"b843bb13-9ae0-4da6-91d5-a372fa57b2b6","company_name":"Sepalumic","segment":"Matériaux de construction","revenue":"38M€","employee_count":"47"},
  {"id":"667d4ac6-c138-4f7c-811f-f7222666ddf6","company_name":"Harvest","segment":"Editeur de logiciels","revenue":"120M€","employee_count":"600"},
  {"id":"06bf80ec-a9aa-4e61-9b4e-1f682a5ca8a8","company_name":"L Occitane","segment":"Cosmétiques","revenue":"2,8 Mds","employee_count":"3k+"},
  {"id":"e2c10122-8fad-458d-ba81-05fd41f1eb20","company_name":"ESCOTA (VINCI)","segment":"Transport","revenue":"6,6 Mds","employee_count":"5365"},
  {"id":"fb718599-0874-4f7b-a3f8-6797273e794e","company_name":"Ampère Software Factory","segment":"Editeur de logiciels","revenue":"539 M€","employee_count":"200"},
  {"id":"b7c8dd96-358d-4fec-a0bf-4b9bbc213f6c","company_name":"Ciffreo Bona","segment":"Matériaux de construction","revenue":"609M€","employee_count":"1300"},
  {"id":"8d68708e-e9eb-443a-82ca-8a64eb9b1541","company_name":"Aqualung","segment":"Equipements de plongée","revenue":"16,5 M€","employee_count":""},
  {"id":"a307cb07-1253-4861-bf1a-53ec23b6f063","company_name":"Adecco","segment":"Emploi","revenue":"5,8Mds €","employee_count":"9000 (FR)"},
  {"id":"cf3daa8d-8e56-43bb-80df-5f1f35023ed1","company_name":"Univet","segment":"Santé animale","revenue":"","employee_count":"1800"},
  {"id":"e825ae2a-3ac7-4d38-8b92-a84e22e7b338","company_name":"Ponant","segment":"Voyage & Séjours","revenue":"512M€","employee_count":"2450"},
  {"id":"6adc75f3-5882-458f-b750-4402c7f086bf","company_name":"Argeville","segment":"Arômes","revenue":"72 M€","employee_count":"315"},
  {"id":"3ba175b0-f51c-4a62-9769-67c4d850f460","company_name":"Groupe Trecobat","segment":"Construction & Promotion","revenue":"203M€","employee_count":"600"},
  {"id":"083ac179-8528-49cc-8aac-efb0f38534cf","company_name":"Centre LACASSAGNE","segment":"Santé publique","revenue":"","employee_count":"964"},
  {"id":"18fdb6ed-91e0-4655-8e2a-140e870c3e38","company_name":"CEGEMA","segment":"Mutuelle","revenue":"47,6M€","employee_count":""},
  {"id":"813881af-3ad4-4d78-ae83-f9678ba73d65","company_name":"KEOLIS Alpes-Maritimes","segment":"Transport","revenue":"19M€","employee_count":"230"},
  {"id":"00132e7b-1f38-4c07-a009-b18b4e6ac34b","company_name":"Interima","segment":"Emploi","revenue":"10,7M€","employee_count":"25"},
  {"id":"454ba409-da04-4c75-b0b5-e4c5cdfe2ec1","company_name":"Université Nice Cote d Azur","segment":"Public","revenue":"","employee_count":"1300"},
  {"id":"7262c2c1-1a75-4475-a742-803f5205403e","company_name":"Jean Niel","segment":"Arômes","revenue":"34M€","employee_count":"120"},
  {"id":"07449e9d-42ce-40b6-a694-d5009624d214","company_name":"CNRS Observatoire Cote d Azur","segment":"Recherche","revenue":"","employee_count":"151"},
  {"id":"36a69be9-c149-4f5f-bfe3-0c0d6b74f21e","company_name":"Pilatus Groupe","segment":"Immobilier","revenue":null,"employee_count":"3"},
  {"id":"fcbfd676-3a75-4d17-8241-815583a3868e","company_name":"ACRI-ST","segment":"Recherche","revenue":"25M€","employee_count":"116"},
  {"id":"bc2c7b51-816c-40b0-be16-0d2ef7cc572b","company_name":"Maman Bulle","segment":"Bien-être","revenue":"TBD","employee_count":"4"},
  {"id":"d977c578-4232-4918-ab86-16142199f2f6","company_name":"Arkopharma","segment":"Pharmaceutique","revenue":"164M€","employee_count":"700"},
  {"id":"c641e823-e6fb-428f-b7f1-e9fa4961d170","company_name":"Experis France","segment":"Informatique","revenue":"238M€","employee_count":"3800"},
  {"id":"f024730c-cf1b-4ec3-8ef2-0cb779120bde","company_name":"Fragonard","segment":"Arômes","revenue":"66M€","employee_count":"250"},
  {"id":"3e2572b6-de3f-44d0-98de-5a00b184afca","company_name":"Ubaldi","segment":"Meubles et électroménager","revenue":"233M€","employee_count":""},
  {"id":"346d2d42-b251-44f9-a66b-0461486d6556","company_name":"Iselection","segment":"Immobilier","revenue":"400M€","employee_count":"150"},
  {"id":"9441e2a5-7b17-402d-950b-13a031fb51cc","company_name":"Laboratoires INELDEA","segment":"Pharmaceutique","revenue":"100 M€","employee_count":""},
  {"id":"0cdcd3c8-464c-4d69-a06a-aa24bfcae1f6","company_name":"Medipath","segment":"Médical","revenue":"","employee_count":""},
  {"id":"73dbbebf-8828-4433-aea7-42ae549c9911","company_name":"Appolonia","segment":"Editeur de logiciels","revenue":"6,8M€","employee_count":"30"}
]

function parseEmployeeCount(value) {
  if (!value) return null
  const str = String(value).trim().toLowerCase()
  if (str === "" || str === "null" || str === "undefined") return null

  // Check for k (thousands)
  // e.g. 3k+ -> 3000, 38k -> 38000
  const kMatch = str.match(/^([\d.,]+)\s*k/)
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(",", "."))
    return isNaN(num) ? null : Math.round(num * 1000)
  }

  // Extract first number group
  // e.g. 36 (France) -> 36, 9000 (FR) -> 9000, 300 (franchisés) -> 300
  const numMatch = str.match(/^(\d+)/)
  if (numMatch) {
    const num = parseInt(numMatch[1], 10)
    return isNaN(num) ? null : num
  }

  return null
}

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.")
    process.exit(1)
  }

  console.log(`Initializing Supabase client for project: ${supabaseUrl}`)
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log(`Updating ${PROSPECTS_DATA.length} companies...`)
  let updatedCount = 0
  let skippedCount = 0

  for (const prospect of PROSPECTS_DATA) {
    const employeeCountVal = parseEmployeeCount(prospect.employee_count)
    
    // Perform update where id matches prospect id
    const { data, error } = await supabase
      .from("companies")
      .update({
        segment: prospect.segment || null,
        revenue: prospect.revenue || null,
        employee_count: employeeCountVal
      })
      .eq("id", prospect.id)
      .select("id, name")

    if (error) {
      console.error(`Error updating company ID ${prospect.id} (${prospect.company_name}):`, error.message)
    } else if (data && data.length > 0) {
      console.log(`Updated company: ${data[0].name} (ID: ${data[0].id}, Employees: ${employeeCountVal})`)
      updatedCount++
    } else {
      console.warn(`Company ID ${prospect.id} (${prospect.company_name}) not found in KREDO. Skipped.`)
      skippedCount++
    }
  }

  console.log(`\nSynchronization finished.`)
  console.log(`Updated: ${updatedCount}`)
  console.log(`Skipped (not found): ${skippedCount}`)
}

run().catch((err) => {
  console.error("Unhanlded error in enrichment script:", err)
  process.exit(1)
})
