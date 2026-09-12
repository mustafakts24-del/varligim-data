// Araç Ekle formu için marka/model/versiyon otomatik tamamlama verisi.
//
// YENİ (Akıllı Değerleme — Araç Ekle iyileştirmesi, 2026-09-11).
// GÜNCELLENDİ (model listesi genişletildi, 2026-09-12).
//
// ÖNEMLİ — dürüstlük notu: bu liste, mobil tarafta oluşturulan
// `lib/data/vehicle_catalog.dart` ile BİREBİR AYNI VERİDİR (mobil/web
// veri parite kuralı gereği). Türkiye'de yaygın satılan (yeni veya
// ikinci el) marka/model isimlerinin GENEL bir listesidir;
// sahibinden.com, OtoEndeks veya başka bir ticari veri kaynağından
// ALINMAMIŞTIR (henüz OtoEndeks kimlik bilgisi yok). Kapsamı TAM
// DEĞİLDİR — listede olmayan bir marka/model yazılırsa kullanıcı yine
// serbestçe elle yazabilir (otomatik tamamlama sadece öneri sunar,
// zorunlu seçim DEĞİLDİR).
//
// `trims` alanı SADECE web araştırmasıyla doğrulanmış birkaç popüler
// model için doludur (kaynaklar: üretici resmi siteleri, auto-data.net,
// ultimatespecs.com, arabavs.com). Motor hacmi (cc) "1.4/1.6/2.0" gibi
// motor adlandırma rakamlarından (bunlar zaten motorun litre cinsinden
// hacmini ifade eder) türetilmiştir. Beygir gücü doğrulanmış ama
// donanım paketi/model yılına göre değişebilir — bu yüzden formda her
// zaman elle düzeltilebilir.
(function (global) {
  'use strict';

  const VEHICLE_CATALOG = {
    'Alfa Romeo': [{ name: 'Giulia' }, { name: 'Giulietta' }, { name: 'MiTo' }, { name: 'Stelvio' }, { name: 'Tonale' }],
    'Audi': [
      { name: 'A1' }, { name: 'A3' }, { name: 'A4' }, { name: 'A5' }, { name: 'A6' }, { name: 'A7' }, { name: 'A8' },
      { name: 'e-tron' }, { name: 'Q2' }, { name: 'Q3' }, { name: 'Q5' }, { name: 'Q7' }, { name: 'Q8' }, { name: 'TT' },
    ],
    'BMW': [
      { name: '1 Serisi' }, { name: '2 Serisi' }, { name: '3 Serisi' }, { name: '4 Serisi' }, { name: '5 Serisi' },
      { name: '6 Serisi' }, { name: '7 Serisi' }, { name: 'i3' }, { name: 'i4' }, { name: 'iX' },
      { name: 'X1' }, { name: 'X2' }, { name: 'X3' }, { name: 'X4' }, { name: 'X5' }, { name: 'X6' }, { name: 'X7' }, { name: 'Z4' },
    ],
    'BYD': [{ name: 'Atto 3' }, { name: 'Dolphin' }, { name: 'Han' }, { name: 'Seal' }, { name: 'Seal U' }, { name: 'Song Plus' }, { name: 'Tang' }],
    'Chery': [
      { name: 'Alkazar' }, { name: 'Arrizo 5' }, { name: 'Tiggo 4 Pro' }, { name: 'Tiggo 7 Pro' },
      { name: 'Tiggo 7 Pro Max' }, { name: 'Tiggo 8 Pro' }, { name: 'Tiggo 8 Pro Max' },
    ],
    'Chevrolet': [
      { name: 'Aveo' }, { name: 'Captiva' }, { name: 'Cruze' }, { name: 'Lacetti' },
      { name: 'Malibu' }, { name: 'Orlando' }, { name: 'Spark' }, { name: 'Trax' },
    ],
    'Citroën': [
      { name: 'Berlingo' }, { name: 'C-Elysée' }, { name: 'C1' }, { name: 'C2' }, { name: 'C3' }, { name: 'C4' },
      { name: 'C4 Cactus' }, { name: 'C5 Aircross' }, { name: 'Jumpy' }, { name: 'Nemo' }, { name: 'SpaceTourer' },
      { name: 'Xsara' }, { name: 'Xsara Picasso' },
    ],
    'Cupra': [{ name: 'Ateca' }, { name: 'Born' }, { name: 'Formentor' }, { name: 'Leon' }],
    'Dacia': [
      { name: 'Dokker' },
      { name: 'Duster', trims: [
        { name: '1.0 TCe (yaklaşık 90-100 hp)', engineLabel: '1.0 TCe', displacementCc: 999 },
        { name: '1.3 TCe 150 hp', engineLabel: '1.3 TCe', displacementCc: 1332, horsepowerHp: 150 },
      ] },
      { name: 'Jogger' },
      { name: 'Lodgy' },
      { name: 'Logan' },
      { name: 'Sandero', trims: [
        { name: '1.0 TCe (yaklaşık 90-100 hp)', engineLabel: '1.0 TCe', displacementCc: 999 },
      ] },
      { name: 'Sandero Stepway' },
      { name: 'Spring' },
    ],
    'DS': [{ name: 'DS3' }, { name: 'DS3 Crossback' }, { name: 'DS4' }, { name: 'DS7' }, { name: 'DS9' }],
    'Fiat': [
      { name: '500' }, { name: '500L' }, { name: '500X' }, { name: 'Albea' }, { name: 'Bravo' }, { name: 'Doblo' }, { name: 'Ducato' },
      { name: 'Egea', trims: [
        { name: '1.4 Fire 95 hp', engineLabel: '1.4 Fire', displacementCc: 1368, horsepowerHp: 95 },
        { name: '1.6 Multijet 130 hp', engineLabel: '1.6 Multijet', displacementCc: 1598, horsepowerHp: 130 },
      ] },
      { name: 'Egea Cross', trims: [
        { name: '1.4 Fire 95 hp', engineLabel: '1.4 Fire', displacementCc: 1368, horsepowerHp: 95 },
        { name: '1.6 Multijet 130 hp', engineLabel: '1.6 Multijet', displacementCc: 1598, horsepowerHp: 130 },
      ] },
      { name: 'Fiorino' }, { name: 'Freemont' }, { name: 'Linea' }, { name: 'Marea' },
      { name: 'Palio' }, { name: 'Panda' }, { name: 'Punto' }, { name: 'Tipo' }, { name: 'Uno' },
    ],
    'Ford': [
      { name: 'B-Max' }, { name: 'Courier' }, { name: 'EcoSport' }, { name: 'Edge' }, { name: 'Escort' }, { name: 'Fiesta' },
      { name: 'Focus' }, { name: 'Galaxy' }, { name: 'Kuga' }, { name: 'Mondeo' }, { name: 'Puma' }, { name: 'Ranger' },
      { name: 'S-Max' }, { name: 'Tourneo Courier' }, { name: 'Tourneo Custom' }, { name: 'Transit' }, { name: 'Transit Custom' },
    ],
    'Honda': [{ name: 'Accord' }, { name: 'City' }, { name: 'Civic' }, { name: 'CR-V' }, { name: 'e:Ny1' }, { name: 'HR-V' }, { name: 'Jazz' }],
    'Hyundai': [
      { name: 'Accent Blue' }, { name: 'Accent Era' }, { name: 'Bayon' }, { name: 'Elantra' }, { name: 'Getz' }, { name: 'i10' },
      { name: 'i20', trims: [
        { name: '1.4 MPI 100 hp', engineLabel: '1.4 MPI', displacementCc: 1368, horsepowerHp: 100 },
      ] },
      { name: 'i30' }, { name: 'i40' }, { name: 'Ioniq' }, { name: 'Ioniq 5' }, { name: 'ix35' }, { name: 'Kona' },
      { name: 'Matrix' }, { name: 'Santa Fe' }, { name: 'Sonata' }, { name: 'Tucson' },
    ],
    'Isuzu': [{ name: 'D-Max' }],
    'Jaguar': [{ name: 'E-Pace' }, { name: 'F-Pace' }, { name: 'F-Type' }, { name: 'XE' }, { name: 'XF' }, { name: 'XJ' }],
    'Jeep': [{ name: 'Avenger' }, { name: 'Cherokee' }, { name: 'Compass' }, { name: 'Grand Cherokee' }, { name: 'Renegade' }, { name: 'Wrangler' }],
    'Kia': [
      { name: 'Carens' }, { name: 'Cerato' }, { name: 'Ceed' }, { name: 'EV6' }, { name: 'Niro' }, { name: 'Picanto' },
      { name: 'Rio' }, { name: 'Sephia' }, { name: 'Shuma' }, { name: 'Sorento' }, { name: 'Soul' },
      { name: 'Sportage' }, { name: 'Stonic' }, { name: 'XCeed' },
    ],
    'Land Rover': [
      { name: 'Defender' }, { name: 'Discovery' }, { name: 'Discovery Sport' }, { name: 'Freelander' },
      { name: 'Range Rover' }, { name: 'Range Rover Evoque' }, { name: 'Range Rover Sport' },
    ],
    'Lexus': [{ name: 'ES' }, { name: 'IS' }, { name: 'LC' }, { name: 'LS' }, { name: 'NX' }, { name: 'RX' }, { name: 'UX' }],
    'Mazda': [
      { name: '323' }, { name: '626' }, { name: 'CX-3' }, { name: 'CX-30' }, { name: 'CX-5' }, { name: 'CX-60' },
      { name: 'Mazda2' }, { name: 'Mazda3' }, { name: 'Mazda6' },
    ],
    'Mercedes-Benz': [
      { name: 'A Serisi' }, { name: 'B Serisi' }, { name: 'C Serisi' }, { name: 'CLA' }, { name: 'CLS' }, { name: 'E Serisi' },
      { name: 'EQA' }, { name: 'EQB' }, { name: 'EQC' }, { name: 'G Serisi' }, { name: 'GLA' }, { name: 'GLB' },
      { name: 'GLC' }, { name: 'GLE' }, { name: 'GLS' }, { name: 'S Serisi' }, { name: 'Sprinter' }, { name: 'V Serisi' }, { name: 'Vito' },
    ],
    'MG': [{ name: 'HS' }, { name: 'MG3' }, { name: 'MG4' }, { name: 'MG5' }, { name: 'RX5' }, { name: 'ZS' }],
    'MINI': [{ name: 'Cabrio' }, { name: 'Clubman' }, { name: 'Cooper' }, { name: 'Countryman' }, { name: 'Paceman' }],
    'Mitsubishi': [
      { name: 'ASX' }, { name: 'Carisma' }, { name: 'Colt' }, { name: 'Eclipse Cross' }, { name: 'L200' },
      { name: 'Lancer' }, { name: 'Outlander' }, { name: 'Pajero' }, { name: 'Space Star' },
    ],
    'Nissan': [
      { name: 'Almera' }, { name: 'Juke' }, { name: 'Leaf' }, { name: 'Micra' }, { name: 'Navara' }, { name: 'Note' },
      { name: 'Pathfinder' }, { name: 'Primera' }, { name: 'Qashqai' }, { name: 'Sunny' }, { name: 'X-Trail' },
    ],
    'Opel': [
      { name: 'Adam' }, { name: 'Antara' }, { name: 'Astra' }, { name: 'Combo' },
      { name: 'Corsa', trims: [
        { name: 'PureTech 100 (yaklaşık)', engineLabel: 'PureTech 100', displacementCc: 1199, horsepowerHp: 100 },
      ] },
      { name: 'Crossland' }, { name: 'Grandland' }, { name: 'Insignia' }, { name: 'Karl' },
      { name: 'Meriva' }, { name: 'Mokka' }, { name: 'Vectra' }, { name: 'Zafira' },
    ],
    'Peugeot': [
      { name: '106' }, { name: '2008' }, { name: '206' }, { name: '207' },
      { name: '208', trims: [
        { name: 'PureTech 100 (yaklaşık)', engineLabel: 'PureTech 100', displacementCc: 1199, horsepowerHp: 100 },
        { name: 'PureTech 130 (yaklaşık)', engineLabel: 'PureTech 130', displacementCc: 1199, horsepowerHp: 130 },
      ] },
      { name: '301' }, { name: '307' }, { name: '308' }, { name: '3008' }, { name: '407' }, { name: '5008' },
      { name: '508' }, { name: '605' }, { name: 'Bipper' }, { name: 'Boxer' }, { name: 'Partner' },
    ],
    'Porsche': [{ name: '718' }, { name: '911' }, { name: 'Boxster' }, { name: 'Cayenne' }, { name: 'Cayman' }, { name: 'Macan' }, { name: 'Panamera' }, { name: 'Taycan' }],
    'Renault': [
      { name: '19' }, { name: '21' }, { name: 'Austral' }, { name: 'Broadway' }, { name: 'Captur' },
      { name: 'Clio', trims: [
        { name: '1.0 TCe 90 hp', engineLabel: '1.0 TCe', displacementCc: 999, horsepowerHp: 90 },
      ] },
      { name: 'Espace' }, { name: 'Fluence' }, { name: 'Kadjar' }, { name: 'Kangoo' }, { name: 'Laguna' },
      { name: 'Megane' }, { name: 'Scenic' }, { name: 'Symbol' }, { name: 'Talisman' }, { name: 'Taliant' },
      { name: 'Toros' }, { name: 'Twingo' }, { name: 'Zoe' },
    ],
    'Seat': [{ name: 'Alhambra' }, { name: 'Arona' }, { name: 'Ateca' }, { name: 'Ibiza' }, { name: 'Leon' }, { name: 'Tarraco' }, { name: 'Toledo' }],
    'Skoda': [
      { name: 'Fabia' }, { name: 'Kamiq' }, { name: 'Karoq' }, { name: 'Kodiaq' }, { name: 'Octavia' },
      { name: 'Rapid' }, { name: 'Roomster' }, { name: 'Scala' }, { name: 'Superb' }, { name: 'Yeti' },
    ],
    'SsangYong / KGM': [{ name: 'Actyon' }, { name: 'Korando' }, { name: 'Musso' }, { name: 'Rexton' }, { name: 'Tivoli' }, { name: 'Torres' }],
    'Subaru': [{ name: 'BRZ' }, { name: 'Forester' }, { name: 'Impreza' }, { name: 'Legacy' }, { name: 'Levorg' }, { name: 'Outback' }, { name: 'XV' }],
    'Suzuki': [{ name: 'Alto' }, { name: 'Baleno' }, { name: 'Celerio' }, { name: 'Grand Vitara' }, { name: 'Jimny' }, { name: 'S-Cross' }, { name: 'Swift' }, { name: 'Vitara' }],
    'Tesla': [{ name: 'Model 3' }, { name: 'Model S' }, { name: 'Model X' }, { name: 'Model Y' }],
    'TOGG': [{ name: 'T10F' }, { name: 'T10X' }],
    'Toyota': [
      { name: 'Auris' }, { name: 'Avensis' }, { name: 'Aygo' }, { name: 'C-HR' }, { name: 'Camry' },
      { name: 'Corolla', trims: [
        { name: '1.8 Hybrid 140 hp', engineLabel: '1.8 Hybrid', displacementCc: 1798, horsepowerHp: 140 },
      ] },
      { name: 'Corolla Cross', trims: [
        { name: '1.8 Hybrid 140 hp', engineLabel: '1.8 Hybrid', displacementCc: 1798, horsepowerHp: 140 },
      ] },
      { name: 'Corolla Verso' }, { name: 'Highlander' }, { name: 'Hilux' }, { name: 'Land Cruiser' },
      { name: 'Prius' }, { name: 'Proace' }, { name: 'RAV4' }, { name: 'Yaris' }, { name: 'Yaris Cross' },
    ],
    'Volkswagen': [
      { name: 'Amarok' }, { name: 'Arteon' }, { name: 'Beetle' }, { name: 'Bora' }, { name: 'Caddy' }, { name: 'Golf' },
      { name: 'ID.3' }, { name: 'ID.4' }, { name: 'Jetta' },
      { name: 'Passat', trims: [
        { name: '1.5 TSI 150 hp', engineLabel: '1.5 TSI', displacementCc: 1498, horsepowerHp: 150 },
        { name: '2.0 TDI 150 hp', engineLabel: '2.0 TDI', displacementCc: 1968, horsepowerHp: 150 },
      ] },
      { name: 'Polo' }, { name: 'Scirocco' }, { name: 'Sharan' }, { name: 'T-Roc' }, { name: 'Taigo' },
      { name: 'Tiguan' }, { name: 'Touareg' }, { name: 'Touran' }, { name: 'Transporter' }, { name: 'up!' }, { name: 'Vento' },
    ],
    'Volvo': [
      { name: 'C30' }, { name: 'S40' }, { name: 'S60' }, { name: 'S80' }, { name: 'S90' },
      { name: 'V40' }, { name: 'V60' }, { name: 'V90' }, { name: 'XC40' }, { name: 'XC60' }, { name: 'XC90' },
    ],
  };

  const VEHICLE_BRANDS = Object.keys(VEHICLE_CATALOG).sort((a, b) => a.localeCompare(b, 'tr'));

  function vehicleModelsForBrand(brand) {
    const key = Object.keys(VEHICLE_CATALOG).find(
      (k) => k.toLowerCase() === String(brand || '').trim().toLowerCase()
    );
    return key ? VEHICLE_CATALOG[key] : [];
  }

  function vehicleTrimsForModel(brand, model) {
    const models = vehicleModelsForBrand(brand);
    const entry = models.find(
      (m) => m.name.toLowerCase() === String(model || '').trim().toLowerCase()
    );
    return entry && entry.trims ? entry.trims : [];
  }

  global.VEHICLE_CATALOG = VEHICLE_CATALOG;
  global.VEHICLE_BRANDS = VEHICLE_BRANDS;
  global.vehicleModelsForBrand = vehicleModelsForBrand;
  global.vehicleTrimsForModel = vehicleTrimsForModel;
})(window);
