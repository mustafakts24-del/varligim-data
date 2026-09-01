/* ==================================================================
 * bist-stocks-data.js
 * Mobil uygulamadaki lib/models/bist_stock.dart dosyasından birebir
 * çıkarılan tam 475 hisselik BIST kataloğu (sembol + şirket adı).
 * Bu, hisse piyasa listesinin (app-piyasa-hisse.js) ve Varlığım
 * hisse portföyü seçim kutusunun (app-varligim.js) statik/fallback
 * veri kaynağıdır. price-proxy'nin type=stock-catalog (KAP canlı
 * kaynağı) başarısız olursa bu liste HER ZAMAN çalışmaya devam eder
 * (kural: mevcut çalışan liste asla bozulmasın).
 * ================================================================== */
const BIST_STOCKS_475 = [
  {
    "symbol": "ACSEL",
    "name": "Acıselsan Acıpayam Selüloz"
  },
  {
    "symbol": "ADEL",
    "name": "Adel Kalemcilik"
  },
  {
    "symbol": "ADESE",
    "name": "Adese Gayrimenkul Yatırım"
  },
  {
    "symbol": "ADGYO",
    "name": "Adra Gayrimenkul Yatırım Ortaklığı"
  },
  {
    "symbol": "AFYON",
    "name": "Afyon Çimento"
  },
  {
    "symbol": "AGHOL",
    "name": "AG Anadolu Grubu Holding"
  },
  {
    "symbol": "AGESA",
    "name": "AgeSA Hayat ve Emeklilik"
  },
  {
    "symbol": "AGROT",
    "name": "Agrotech Yüksek Teknoloji"
  },
  {
    "symbol": "AHSGY",
    "name": "Ahes Gayrimenkul Yatırım Ortaklığı"
  },
  {
    "symbol": "AHGAZ",
    "name": "Ahlatcı Doğal Gaz"
  },
  {
    "symbol": "AKBNK",
    "name": "Akbank"
  },
  {
    "symbol": "AKCNS",
    "name": "Akçansa Çimento"
  },
  {
    "symbol": "AKENR",
    "name": "Akenerji"
  },
  {
    "symbol": "AKFGY",
    "name": "Akfen Gayrimenkul Yatırım Ortaklığı"
  },
  {
    "symbol": "AKFIS",
    "name": "Akfen İnşaat"
  },
  {
    "symbol": "AKFYE",
    "name": "Akfen Yenilenebilir Enerji"
  },
  {
    "symbol": "AKSGY",
    "name": "Akiş Gayrimenkul Yatırım Ortaklığı"
  },
  {
    "symbol": "AKMGY",
    "name": "Akmerkez Gayrimenkul Yatırım Ortaklığı"
  },
  {
    "symbol": "AKSA",
    "name": "Aksa Akrilik"
  },
  {
    "symbol": "AKSEN",
    "name": "Aksa Enerji"
  },
  {
    "symbol": "AKGRT",
    "name": "Aksigorta"
  },
  {
    "symbol": "AKSUE",
    "name": "Aksu Enerji"
  },
  {
    "symbol": "ALCAR",
    "name": "Alarko Carrier"
  },
  {
    "symbol": "ALGYO",
    "name": "Alarko Gayrimenkul Yatırım Ortaklığı"
  },
  {
    "symbol": "ALARK",
    "name": "Alarko Holding"
  },
  {
    "symbol": "ALBRK",
    "name": "Albaraka Türk"
  },
  {
    "symbol": "ALCTL",
    "name": "Alcatel Lucent Teletaş"
  },
  {
    "symbol": "ALFAS",
    "name": "Alfa Solar Enerji"
  },
  {
    "symbol": "ALKIM",
    "name": "Alkim Alkali Kimya"
  },
  {
    "symbol": "ALKA",
    "name": "Alkim Kağıt"
  },
  {
    "symbol": "AYCES",
    "name": "Altın Yunus Çeşme"
  },
  {
    "symbol": "ALTNY",
    "name": "Altınay Savunma Teknolojileri"
  },
  {
    "symbol": "ALKLC",
    "name": "Altınkılıç Gıda"
  },
  {
    "symbol": "ALVES",
    "name": "Alves Kablo"
  },
  {
    "symbol": "ANSGR",
    "name": "Anadolu Sigorta"
  },
  {
    "symbol": "AEFES",
    "name": "Anadolu Efes"
  },
  {
    "symbol": "ANHYT",
    "name": "Anadolu Hayat Emeklilik"
  },
  {
    "symbol": "ASUZU",
    "name": "Anadolu Isuzu"
  },
  {
    "symbol": "ANGEN",
    "name": "Anatolia Tanı ve Biyoteknoloji"
  },
  {
    "symbol": "ANELE",
    "name": "Anel Elektrik"
  },
  {
    "symbol": "ARCLK",
    "name": "Arçelik"
  },
  {
    "symbol": "ARDYZ",
    "name": "ARD Grup Bilişim"
  },
  {
    "symbol": "ARENA",
    "name": "Arena Bilgisayar"
  },
  {
    "symbol": "ARFYE",
    "name": "ARF Bio Yenilenebilir Enerji"
  },
  {
    "symbol": "ARMGD",
    "name": "Armada Gıda"
  },
  {
    "symbol": "ARSAN",
    "name": "Arsan Holding"
  },
  {
    "symbol": "ARTMS",
    "name": "Artemis Halı"
  },
  {
    "symbol": "ARZUM",
    "name": "Arzum Elektrikli Ev Aletleri"
  },
  {
    "symbol": "ASGYO",
    "name": "Asce Gayrimenkul Yatırım Ortaklığı"
  },
  {
    "symbol": "ASELS",
    "name": "Aselsan"
  },
  {
    "symbol": "ASTOR",
    "name": "Astor Enerji"
  },
  {
    "symbol": "ATAGY",
    "name": "Ata Gayrimenkul Yatırım Ortaklığı"
  },
  {
    "symbol": "ATAKP",
    "name": "Atakey Patates"
  },
  {
    "symbol": "AGYO",
    "name": "Atakule Gayrimenkul Yatırım Ortaklığı"
  },
  {
    "symbol": "ATSYH",
    "name": "Atlantis Yatırım Holding"
  },
  {
    "symbol": "ATLAS",
    "name": "Atlas Menkul Kıymetler Yatırım Ortaklığı"
  },
  {
    "symbol": "ATATP",
    "name": "ATP Yazılım"
  },
  {
    "symbol": "AVOD",
    "name": "AVOD Kurutulmuş Gıda"
  },
  {
    "symbol": "AVGYO",
    "name": "Avrasya Gayrimenkul Yatırım Ortaklığı"
  },
  {
    "symbol": "AVTUR",
    "name": "Avrasya Petrol ve Turistik Tesisler"
  },
  {
    "symbol": "AVHOL",
    "name": "Avrupa Yatırım Holding"
  },
  {
    "symbol": "AVPGY",
    "name": "Avrupakent Gayrimenkul Yatırım Ortaklığı"
  },
  {
    "symbol": "AYDEM",
    "name": "Aydem Yenilenebilir Enerji"
  },
  {
    "symbol": "AYEN",
    "name": "Ayen Enerji"
  },
  {
    "symbol": "AYES",
    "name": "Ayes Çelik"
  },
  {
    "symbol": "AYGAZ",
    "name": "Aygaz"
  },
  {
    "symbol": "AZTEK",
    "name": "Aztek Teknoloji"
  },
  {
    "symbol": "BAGFS",
    "name": "Bagfaş"
  },
  {
    "symbol": "BAHKM",
    "name": "Bahadır Kimya"
  },
  {
    "symbol": "BAKAB",
    "name": "Bak Ambalaj"
  },
  {
    "symbol": "BALAT",
    "name": "Balatacılar"
  },
  {
    "symbol": "BALSU",
    "name": "Balsu Gıda"
  },
  {
    "symbol": "BNTAS",
    "name": "Bantaş Ambalaj"
  },
  {
    "symbol": "THYAO",
    "name": "Türk Hava Yolları"
  },
  {
    "symbol": "TUPRS",
    "name": "Tüpraş"
  },
  {
    "symbol": "BIMAS",
    "name": "BİM Birleşik Mağazalar"
  },
  {
    "symbol": "GARAN",
    "name": "Garanti BBVA"
  },
  {
    "symbol": "YKBNK",
    "name": "Yapı Kredi"
  },
  {
    "symbol": "ISCTR",
    "name": "Türkiye İş Bankası C"
  },
  {
    "symbol": "KCHOL",
    "name": "Koç Holding"
  },
  {
    "symbol": "SAHOL",
    "name": "Sabancı Holding"
  },
  {
    "symbol": "SISE",
    "name": "Şişecam"
  },
  {
    "symbol": "EREGL",
    "name": "Ereğli Demir Çelik"
  },
  {
    "symbol": "FROTO",
    "name": "Ford Otosan"
  },
  {
    "symbol": "TOASO",
    "name": "Tofaş"
  },
  {
    "symbol": "TCELL",
    "name": "Turkcell"
  },
  {
    "symbol": "TAVHL",
    "name": "TAV Havalimanları"
  },
  {
    "symbol": "PETKM",
    "name": "Petkim"
  },
  {
    "symbol": "ENKAI",
    "name": "Enka İnşaat"
  },
  {
    "symbol": "SASA",
    "name": "Sasa Polyester"
  },
  {
    "symbol": "MGROS",
    "name": "Migros Ticaret"
  },
  {
    "symbol": "KONTR",
    "name": "Kontrolmatik Teknoloji"
  },
  {
    "symbol": "CEMZY",
    "name": "Cem Zeytin"
  },
  {
    "symbol": "CCOLA",
    "name": "Coca-Cola İçecek"
  },
  {
    "symbol": "CVKMD",
    "name": "CVK Maden İşletmeleri"
  },
  {
    "symbol": "CWENE",
    "name": "CW Enerji"
  },
  {
    "symbol": "CGCAM",
    "name": "Çağdaş Cam"
  },
  {
    "symbol": "CANTE",
    "name": "Çan2 Termik"
  },
  {
    "symbol": "CLEBI",
    "name": "Çelebi Hava Servisi"
  },
  {
    "symbol": "CIMSA",
    "name": "Çimsa Çimento"
  },
  {
    "symbol": "DAPGM",
    "name": "DAP Gayrimenkul Geliştirme"
  },
  {
    "symbol": "DSTKF",
    "name": "Destek Finans Faktoring"
  },
  {
    "symbol": "DEVA",
    "name": "Deva Holding"
  },
  {
    "symbol": "DOFRB",
    "name": "DOF Robotik"
  },
  {
    "symbol": "DOHOL",
    "name": "Doğan Holding"
  },
  {
    "symbol": "ARASE",
    "name": "Doğu Aras Enerji"
  },
  {
    "symbol": "DOAS",
    "name": "Doğuş Otomotiv"
  },
  {
    "symbol": "EBEBK",
    "name": "Ebebek"
  },
  {
    "symbol": "ECOGR",
    "name": "Ecogreen Enerji Holding"
  },
  {
    "symbol": "ECZYT",
    "name": "Eczacıbaşı Yatırım Holding"
  },
  {
    "symbol": "EFOR",
    "name": "Efor Yatırım"
  },
  {
    "symbol": "EGEEN",
    "name": "Ege Endüstri"
  },
  {
    "symbol": "EGGUB",
    "name": "Ege Gübre"
  },
  {
    "symbol": "EGPRO",
    "name": "Ege Profil"
  },
  {
    "symbol": "ECILC",
    "name": "Eczacıbaşı İlaç"
  },
  {
    "symbol": "EKIM",
    "name": "Ekim Turizm"
  },
  {
    "symbol": "EKDMR",
    "name": "Ekinciler Demir Çelik"
  },
  {
    "symbol": "EKGYO",
    "name": "Emlak Konut GYO"
  },
  {
    "symbol": "ENDAE",
    "name": "Enda Enerji Holding"
  },
  {
    "symbol": "ENJSA",
    "name": "Enerjisa Enerji"
  },
  {
    "symbol": "ENERY",
    "name": "Enerya Enerji"
  },
  {
    "symbol": "ENKAI",
    "name": "Enka İnşaat"
  },
  {
    "symbol": "EREGL",
    "name": "Ereğli Demir Çelik"
  },
  {
    "symbol": "ESCAR",
    "name": "Escar Filo"
  },
  {
    "symbol": "ESEN",
    "name": "Esenboğa Elektrik"
  },
  {
    "symbol": "TEZOL",
    "name": "Europap Tezol Kağıt"
  },
  {
    "symbol": "EUREN",
    "name": "Europen Endüstri"
  },
  {
    "symbol": "EUPWR",
    "name": "Europower Enerji"
  },
  {
    "symbol": "FENER",
    "name": "Fenerbahçe Futbol"
  },
  {
    "symbol": "FROTO",
    "name": "Ford Otosan"
  },
  {
    "symbol": "FZLGY",
    "name": "Fuzul GYO"
  },
  {
    "symbol": "GSRAY",
    "name": "Galatasaray Sportif"
  },
  {
    "symbol": "GWIND",
    "name": "Galata Wind Enerji"
  },
  {
    "symbol": "GEDIK",
    "name": "Gedik Yatırım"
  },
  {
    "symbol": "GLCVY",
    "name": "Gelecek Varlık Yönetimi"
  },
  {
    "symbol": "GENIL",
    "name": "Gen İlaç"
  },
  {
    "symbol": "GENTS",
    "name": "Gentaş"
  },
  {
    "symbol": "GIPTA",
    "name": "Gıpta Ofis"
  },
  {
    "symbol": "GMTAS",
    "name": "Gimat Mağazacılık"
  },
  {
    "symbol": "GESAN",
    "name": "Girişim Elektrik"
  },
  {
    "symbol": "GLYHO",
    "name": "Global Yatırım Holding"
  },
  {
    "symbol": "GOKNR",
    "name": "Göknur Gıda"
  },
  {
    "symbol": "GOLTS",
    "name": "Göltaş Çimento"
  },
  {
    "symbol": "GOZDE",
    "name": "Gözde Girişim"
  },
  {
    "symbol": "GRTHO",
    "name": "GrainTurk Holding"
  },
  {
    "symbol": "GUBRF",
    "name": "Gübre Fabrikaları"
  },
  {
    "symbol": "GLRMK",
    "name": "Gülermak"
  },
  {
    "symbol": "GRSEL",
    "name": "Gür-Sel Turizm"
  },
  {
    "symbol": "SAHOL",
    "name": "Hacı Ömer Sabancı Holding"
  },
  {
    "symbol": "HLGYO",
    "name": "Halk Gayrimenkul Yatırım Ortaklığı"
  },
  {
    "symbol": "HRKET",
    "name": "Hareket Proje Taşımacılığı"
  },
  {
    "symbol": "HATSN",
    "name": "Hat-San Gemi İnşaa"
  },
  {
    "symbol": "HATEK",
    "name": "Hateks Hatay Tekstil"
  },
  {
    "symbol": "HDFGS",
    "name": "Hedef Girişim Sermayesi Yatırım Ortaklığı"
  },
  {
    "symbol": "HEDEF",
    "name": "Hedef Holding"
  },
  {
    "symbol": "HEKTS",
    "name": "Hektaş"
  },
  {
    "symbol": "HKTM",
    "name": "Hidropar Hareket Kontrol Teknolojileri"
  },
  {
    "symbol": "HTTBT",
    "name": "Hitit Bilgisayar Hizmetleri"
  },
  {
    "symbol": "HOROZ",
    "name": "Horoz Lojistik"
  },
  {
    "symbol": "HUBVC",
    "name": "HUB Girişim Sermayesi Yatırım Ortaklığı"
  },
  {
    "symbol": "HUNER",
    "name": "Hun Yenilenebilir Enerji"
  },
  {
    "symbol": "HURGZ",
    "name": "Hürriyet Gazetecilik"
  },
  {
    "symbol": "ENTRA",
    "name": "IC Enterra Yenilenebilir Enerji"
  },
  {
    "symbol": "ICBCT",
    "name": "ICBC Turkey Bank"
  },
  {
    "symbol": "ICUGS",
    "name": "ICU Girişim Sermayesi Yatırım Ortaklığı"
  },
  {
    "symbol": "INVEO",
    "name": "Inveo Yatırım Holding"
  },
  {
    "symbol": "INVES",
    "name": "Investco Holding"
  },
  {
    "symbol": "INGRM",
    "name": "Ingram Micro Bilişim Sistemleri"
  },
  {
    "symbol": "IEYHO",
    "name": "Işıklar Enerji ve Yapı Holding"
  },
  {
    "symbol": "ISKPL",
    "name": "Işık Plastik"
  },
  {
    "symbol": "IDGYO",
    "name": "İdealist Gayrimenkul Yatırım Ortaklığı"
  },
  {
    "symbol": "IHEVA",
    "name": "İhlas Ev Aletleri"
  },
  {
    "symbol": "IHLGM",
    "name": "İhlas Gayrimenkul Proje Geliştirme"
  },
  {
    "symbol": "IHGZT",
    "name": "İhlas Gazetecilik"
  },
  {
    "symbol": "IHAAS",
    "name": "İhlas Haber Ajansı"
  },
  {
    "symbol": "IHLAS",
    "name": "İhlas Holding"
  },
  {
    "symbol": "IHYAY",
    "name": "İhlas Yayın Holding"
  },
  {
    "symbol": "IMASM",
    "name": "İmaş Makina"
  },
  {
    "symbol": "INDES",
    "name": "İndeks Bilgisayar"
  },
  {
    "symbol": "INFO",
    "name": "İnfo Yatırım"
  },
  {
    "symbol": "INTEM",
    "name": "İntema"
  },
  {
    "symbol": "ISDMR",
    "name": "İskenderun Demir Çelik"
  },
  {
    "symbol": "ISFIN",
    "name": "İş Finansal Kiralama"
  },
  {
    "symbol": "ISGSY",
    "name": "İş Girişim Sermayesi Yatırım Ortaklığı"
  },
  {
    "symbol": "ISGYO",
    "name": "İş Gayrimenkul Yatırım Ortaklığı"
  },
  {
    "symbol": "ISBIR",
    "name": "İşbir Holding"
  },
  {
    "symbol": "ISSEN",
    "name": "İşbir Sentetik Dokuma"
  },
  {
    "symbol": "ISMEN",
    "name": "İş Yatırım Menkul Değerler"
  },
  {
    "symbol": "ISYAT",
    "name": "İş Yatırım Ortaklığı"
  },
  {
    "symbol": "ISVEA",
    "name": "İsvea Seramik"
  },
  {
    "symbol": "IZENR",
    "name": "İzdemir Enerji"
  },
  {
    "symbol": "IZMDC",
    "name": "İzmir Demir Çelik"
  },
  {
    "symbol": "IZFAS",
    "name": "İzmir Fırça"
  },
  {
    "symbol": "IZINV",
    "name": "İz Yatırım Holding"
  },
  {
    "symbol": "JANTS",
    "name": "Jantsa Jant Sanayi"
  },
  {
    "symbol": "KFEIN",
    "name": "Kafein Yazılım"
  },
  {
    "symbol": "KLKIM",
    "name": "Kalekim"
  },
  {
    "symbol": "KLSER",
    "name": "Kaleseramik"
  },
  {
    "symbol": "KLYPV",
    "name": "Kalyon Güneş Teknolojileri"
  },
  {
    "symbol": "KAPLM",
    "name": "Kaplamin Ambalaj"
  },
  {
    "symbol": "KARCL",
    "name": "Kardemir Çelik"
  },
  {
    "symbol": "KRDMA",
    "name": "Kardemir A"
  },
  {
    "symbol": "KRDMB",
    "name": "Kardemir B"
  },
  {
    "symbol": "KRDMD",
    "name": "Kardemir D"
  },
  {
    "symbol": "KAREL",
    "name": "Karel Elektronik"
  },
  {
    "symbol": "KARSN",
    "name": "Karsan Otomotiv"
  },
  {
    "symbol": "KARTN",
    "name": "Kartonsan"
  },
  {
    "symbol": "KRTEK",
    "name": "Karsu Tekstil"
  },
  {
    "symbol": "KTLEV",
    "name": "Katılımevim"
  },
  {
    "symbol": "KATMR",
    "name": "Katmerciler"
  },
  {
    "symbol": "KAYSE",
    "name": "Kayseri Şeker"
  },
  {
    "symbol": "KENT",
    "name": "Kent Gıda"
  },
  {
    "symbol": "KERVN",
    "name": "Kervansaray Yatırım Holding"
  },
  {
    "symbol": "KRVGD",
    "name": "Kervan Gıda"
  },
  {
    "symbol": "KZBGY",
    "name": "Kızılbük GYO"
  },
  {
    "symbol": "KLGYO",
    "name": "Kiler GYO"
  },
  {
    "symbol": "KLRHO",
    "name": "Kiler Holding"
  },
  {
    "symbol": "KIMMR",
    "name": "Kimmr"
  },
  {
    "symbol": "KMPUR",
    "name": "Kimteks Poliüretan"
  },
  {
    "symbol": "KLMSN",
    "name": "Klimasan"
  },
  {
    "symbol": "KCAER",
    "name": "Kocaer Çelik"
  },
  {
    "symbol": "KLSYN",
    "name": "Koleksiyon Mobilya"
  },
  {
    "symbol": "KNFRT",
    "name": "Konfrut Tarım"
  },
  {
    "symbol": "KONKA",
    "name": "Konya Kağıt"
  },
  {
    "symbol": "KONYA",
    "name": "Konya Çimento"
  },
  {
    "symbol": "KGYO",
    "name": "Koray GYO"
  },
  {
    "symbol": "KORDS",
    "name": "Kordsa"
  },
  {
    "symbol": "KRPLS",
    "name": "Koroplast"
  },
  {
    "symbol": "KOTON",
    "name": "Koton"
  },
  {
    "symbol": "KRGYO",
    "name": "Körfez GYO"
  },
  {
    "symbol": "KOPOL",
    "name": "Koza Polyester"
  },
  {
    "symbol": "KRSTL",
    "name": "Kristal Kola"
  },
  {
    "symbol": "KRONT",
    "name": "Kron Teknoloji"
  },
  {
    "symbol": "KSTUR",
    "name": "Kuştur Kuşadası Turizm"
  },
  {
    "symbol": "KUYAS",
    "name": "Kuyaş Yatırım"
  },
  {
    "symbol": "KUVVA",
    "name": "Kuvva Gıda"
  },
  {
    "symbol": "KBORU",
    "name": "Kuzey Boru"
  },
  {
    "symbol": "KZGYO",
    "name": "Kuzu Grup GYO"
  },
  {
    "symbol": "KUTPO",
    "name": "Kütahya Porselen"
  },
  {
    "symbol": "KTSKR",
    "name": "Kütahya Şeker"
  },
  {
    "symbol": "LIDER",
    "name": "LDR Turizm"
  },
  {
    "symbol": "LIDFA",
    "name": "Lider Faktoring"
  },
  {
    "symbol": "LILAK",
    "name": "Lila Kağıt"
  },
  {
    "symbol": "LMKDC",
    "name": "Limak Doğu Anadolu Çimento"
  },
  {
    "symbol": "LINK",
    "name": "Link Bilgisayar"
  },
  {
    "symbol": "LKMNH",
    "name": "Lokman Hekim"
  },
  {
    "symbol": "LOGO",
    "name": "Logo Yazılım"
  },
  {
    "symbol": "LRSHO",
    "name": "Loras Holding"
  },
  {
    "symbol": "LXGYO",
    "name": "Luxera GYO"
  },
  {
    "symbol": "LUKSK",
    "name": "Lüks Kadife"
  },
  {
    "symbol": "LYDHO",
    "name": "Lydia Holding"
  },
  {
    "symbol": "LYDYE",
    "name": "Lydia Yeşil Enerji"
  },
  {
    "symbol": "MACKO",
    "name": "Mackolik"
  },
  {
    "symbol": "MAGEN",
    "name": "Margün Enerji"
  },
  {
    "symbol": "MAKIM",
    "name": "Makim Makina"
  },
  {
    "symbol": "MAKTK",
    "name": "Makina Takım"
  },
  {
    "symbol": "MANAS",
    "name": "Manas Enerji"
  },
  {
    "symbol": "MARKA",
    "name": "Marka Yatırım Holding"
  },
  {
    "symbol": "MARMR",
    "name": "Marmara Holding"
  },
  {
    "symbol": "MAALT",
    "name": "Marmaris Altınyunus"
  },
  {
    "symbol": "MRSHL",
    "name": "Marshall Boya"
  },
  {
    "symbol": "MRGYO",
    "name": "Martı GYO"
  },
  {
    "symbol": "MARTI",
    "name": "Martı Otel"
  },
  {
    "symbol": "MASFN",
    "name": "Masfen Enerji"
  },
  {
    "symbol": "MTRKS",
    "name": "Matriks Finansal Teknolojiler"
  },
  {
    "symbol": "MAVI",
    "name": "Mavi Giyim"
  },
  {
    "symbol": "MZHLD",
    "name": "Mazhar Zorlu Holding"
  },
  {
    "symbol": "MEDTR",
    "name": "Meditera"
  },
  {
    "symbol": "MEGMT",
    "name": "Mega Metal"
  },
  {
    "symbol": "MEGAP",
    "name": "Mega Polietilen Köpük"
  },
  {
    "symbol": "MEKAG",
    "name": "Meka Global Makine"
  },
  {
    "symbol": "MNDRS",
    "name": "Menderes Tekstil"
  },
  {
    "symbol": "MERCN",
    "name": "Mercan Kimya"
  },
  {
    "symbol": "MERIT",
    "name": "Merit Turizm"
  },
  {
    "symbol": "MERKO",
    "name": "Merko Gıda"
  },
  {
    "symbol": "METEN",
    "name": "Metgün Enerji"
  },
  {
    "symbol": "MCARD",
    "name": "Metropal Kurumsal Hizmetler"
  },
  {
    "symbol": "METRO",
    "name": "Metro Ticari ve Mali Yatırımlar"
  },
  {
    "symbol": "MEPET",
    "name": "Mepet Metro Petrol"
  },
  {
    "symbol": "MTRYO",
    "name": "Metro Yatırım Ortaklığı"
  },
  {
    "symbol": "MEYSU",
    "name": "Meysu Gıda"
  },
  {
    "symbol": "MHRGY",
    "name": "MHR GYO"
  },
  {
    "symbol": "MIATK",
    "name": "Mia Teknoloji"
  },
  {
    "symbol": "MSGYO",
    "name": "Mistral GYO"
  },
  {
    "symbol": "MPARK",
    "name": "MLP Sağlık Hizmetleri"
  },
  {
    "symbol": "MOBTL",
    "name": "Mobiltel"
  },
  {
    "symbol": "MOGAN",
    "name": "Mogan Enerji"
  },
  {
    "symbol": "MNDTR",
    "name": "Mondi Turkey"
  },
  {
    "symbol": "MOPAS",
    "name": "Mopaş Marketçilik"
  },
  {
    "symbol": "MMCAS",
    "name": "MMC Sanayi"
  },
  {
    "symbol": "NTGAZ",
    "name": "Naturelgaz"
  },
  {
    "symbol": "NATEN",
    "name": "Naturel Yenilenebilir Enerji"
  },
  {
    "symbol": "NETCD",
    "name": "Netcad Yazılım"
  },
  {
    "symbol": "NTHOL",
    "name": "Net Holding"
  },
  {
    "symbol": "NETAS",
    "name": "Netaş Telekomünikasyon"
  },
  {
    "symbol": "NIBAS",
    "name": "Niğbaş Niğde Beton"
  },
  {
    "symbol": "NUHCM",
    "name": "Nuh Çimento"
  },
  {
    "symbol": "NUGYO",
    "name": "Nurol GYO"
  },
  {
    "symbol": "OBAMS",
    "name": "Oba Makarnacılık"
  },
  {
    "symbol": "OBASE",
    "name": "Obase Bilgisayar"
  },
  {
    "symbol": "ODAS",
    "name": "Odaş Elektrik"
  },
  {
    "symbol": "ODINE",
    "name": "Odine Solutions"
  },
  {
    "symbol": "OFSYM",
    "name": "Ofis Yem"
  },
  {
    "symbol": "ONCSM",
    "name": "Oncosem Onkolojik Sistemler"
  },
  {
    "symbol": "ONRYT",
    "name": "Onur Yüksek Teknoloji"
  },
  {
    "symbol": "ORGE",
    "name": "Orge Enerji Elektrik"
  },
  {
    "symbol": "ORZAX",
    "name": "Orzaks İlaç"
  },
  {
    "symbol": "OSMEN",
    "name": "Osmanlı Yatırım"
  },
  {
    "symbol": "OSTIM",
    "name": "Ostim Endüstriyel Yatırımlar"
  },
  {
    "symbol": "OTKAR",
    "name": "Otokar"
  },
  {
    "symbol": "OTTO",
    "name": "Otto Holding"
  },
  {
    "symbol": "OYAKC",
    "name": "Oyak Çimento"
  },
  {
    "symbol": "OYAYO",
    "name": "Oyak Yatırım Ortaklığı"
  },
  {
    "symbol": "OYLUM",
    "name": "Oylum Sınai Yatırımlar"
  },
  {
    "symbol": "OYYAT",
    "name": "Oyak Yatırım"
  },
  {
    "symbol": "OZKGY",
    "name": "Özak GYO"
  },
  {
    "symbol": "OZATD",
    "name": "Özata Denizcilik"
  },
  {
    "symbol": "OZGYO",
    "name": "Özderici GYO"
  },
  {
    "symbol": "OZRDN",
    "name": "Özerden Ambalaj"
  },
  {
    "symbol": "OZSUB",
    "name": "Özsu Balık"
  },
  {
    "symbol": "OZYSR",
    "name": "Özyaşar Tel ve Galvanizleme"
  },
  {
    "symbol": "PAGYO",
    "name": "Panora GYO"
  },
  {
    "symbol": "PAMEL",
    "name": "Pamel Yenilenebilir Elektrik"
  },
  {
    "symbol": "PAPIL",
    "name": "Papilon Savunma"
  },
  {
    "symbol": "PARSN",
    "name": "Parsan"
  },
  {
    "symbol": "PASEU",
    "name": "Pasifik Eurasia Lojistik"
  },
  {
    "symbol": "PSGYO",
    "name": "Pasifik GYO"
  },
  {
    "symbol": "PAHOL",
    "name": "Pasifik Holding"
  },
  {
    "symbol": "PATEK",
    "name": "Pasifik Teknoloji"
  },
  {
    "symbol": "PRDGS",
    "name": "Pardus Girişim"
  },
  {
    "symbol": "PRKME",
    "name": "Park Elektrik"
  },
  {
    "symbol": "PCILT",
    "name": "PC İletişim"
  },
  {
    "symbol": "PEKGY",
    "name": "Peker GYO"
  },
  {
    "symbol": "PENGD",
    "name": "Penguen Gıda"
  },
  {
    "symbol": "PENTA",
    "name": "Penta Teknoloji"
  },
  {
    "symbol": "PGSUS",
    "name": "Pegasus"
  },
  {
    "symbol": "PSDTC",
    "name": "Pergamon Status"
  },
  {
    "symbol": "PKENT",
    "name": "Petrokent Turizm"
  },
  {
    "symbol": "PETUN",
    "name": "Pınar Et ve Un"
  },
  {
    "symbol": "PINSU",
    "name": "Pınar Su"
  },
  {
    "symbol": "PNSUT",
    "name": "Pınar Süt"
  },
  {
    "symbol": "PKART",
    "name": "Plastikkart"
  },
  {
    "symbol": "PLTUR",
    "name": "Platform Turizm"
  },
  {
    "symbol": "PNLSN",
    "name": "Panelsan"
  },
  {
    "symbol": "POLHO",
    "name": "Polisan Holding"
  },
  {
    "symbol": "POLTK",
    "name": "Politeknik Metal"
  },
  {
    "symbol": "PRZMA",
    "name": "Prizma Matbaacılık"
  },
  {
    "symbol": "QUAGR",
    "name": "Qua Granite"
  },
  {
    "symbol": "QUICK",
    "name": "Quick Sigorta"
  },
  {
    "symbol": "QNBTR",
    "name": "QNB Bank"
  },
  {
    "symbol": "RALYH",
    "name": "RAL Yatırım Holding"
  },
  {
    "symbol": "RAYSG",
    "name": "Ray Sigorta"
  },
  {
    "symbol": "REEDR",
    "name": "Reeder Teknoloji"
  },
  {
    "symbol": "RYGYO",
    "name": "Reysaş GYO"
  },
  {
    "symbol": "RYSAS",
    "name": "Reysaş Taşımacılık"
  },
  {
    "symbol": "RGYAS",
    "name": "Rönesans Gayrimenkul"
  },
  {
    "symbol": "RNPOL",
    "name": "Rainbow Polikarbonat"
  },
  {
    "symbol": "RODRG",
    "name": "Rodrigo Tekstil"
  },
  {
    "symbol": "RTALB",
    "name": "RTA Laboratuvarları"
  },
  {
    "symbol": "RUBNS",
    "name": "Rubenis Tekstil"
  },
  {
    "symbol": "RUZYE",
    "name": "Ruzy Madencilik ve Enerji"
  },
  {
    "symbol": "SSAAT",
    "name": "Saat ve Saat"
  },
  {
    "symbol": "SAFKR",
    "name": "Safkar"
  },
  {
    "symbol": "SANEL",
    "name": "San-El Mühendislik"
  },
  {
    "symbol": "SANFM",
    "name": "Sanifoam"
  },
  {
    "symbol": "SANKO",
    "name": "Sanko Pazarlama"
  },
  {
    "symbol": "SARKY",
    "name": "Sarkuysan"
  },
  {
    "symbol": "SAMAT",
    "name": "Saray Matbaacılık"
  },
  {
    "symbol": "SVGYO",
    "name": "Savur GYO"
  },
  {
    "symbol": "SAYAS",
    "name": "Say Yenilenebilir Enerji"
  },
  {
    "symbol": "SDTTR",
    "name": "SDT Uzay ve Savunma"
  },
  {
    "symbol": "SEGMN",
    "name": "Seğmen Kardeşler Gıda"
  },
  {
    "symbol": "SELEC",
    "name": "Selçuk Ecza Deposu"
  },
  {
    "symbol": "SELVA",
    "name": "Selva Gıda"
  },
  {
    "symbol": "SERNT",
    "name": "Seranit"
  },
  {
    "symbol": "SRVGY",
    "name": "Servet GYO"
  },
  {
    "symbol": "SEKUR",
    "name": "Sekuro Plastik"
  },
  {
    "symbol": "SEYKM",
    "name": "Seyitler Kimya"
  },
  {
    "symbol": "SILVR",
    "name": "Silverline"
  },
  {
    "symbol": "SNGYO",
    "name": "Sinpaş GYO"
  },
  {
    "symbol": "SKYLP",
    "name": "Skyalp Finansal Teknolojiler"
  },
  {
    "symbol": "SMART",
    "name": "Smartiks Yazılım"
  },
  {
    "symbol": "SMRTG",
    "name": "Smart Güneş Enerjisi"
  },
  {
    "symbol": "SODSN",
    "name": "Sodaş Sodyum"
  },
  {
    "symbol": "SOKE",
    "name": "Söke Değirmencilik"
  },
  {
    "symbol": "SONME",
    "name": "Sönmez Filament"
  },
  {
    "symbol": "SNPAM",
    "name": "Sönmez Pamuklu"
  },
  {
    "symbol": "SKTAS",
    "name": "Söktaş Tekstil"
  },
  {
    "symbol": "SUMAS",
    "name": "Sumaş"
  },
  {
    "symbol": "SUNTK",
    "name": "Sun Tekstil"
  },
  {
    "symbol": "SURGY",
    "name": "Sur Tatil Evleri GYO"
  },
  {
    "symbol": "SUWEN",
    "name": "Suwen Tekstil"
  },
  {
    "symbol": "SARAE",
    "name": "Şa-Ra Enerji"
  },
  {
    "symbol": "SKBNK",
    "name": "Şekerbank"
  },
  {
    "symbol": "SEGYO",
    "name": "Şeker GYO"
  },
  {
    "symbol": "SEKFK",
    "name": "Şeker Finansal Kiralama"
  },
  {
    "symbol": "SKYMD",
    "name": "Şeker Yatırım"
  },
  {
    "symbol": "SOKM",
    "name": "Şok Marketler"
  },
  {
    "symbol": "TABGD",
    "name": "TAB Gıda"
  },
  {
    "symbol": "TNZTP",
    "name": "Tapdi Oksijen"
  },
  {
    "symbol": "TARKM",
    "name": "Tarkim Bitki Koruma"
  },
  {
    "symbol": "TATEN",
    "name": "Tatlıpınar Enerji"
  },
  {
    "symbol": "TATGD",
    "name": "Tat Gıda"
  },
  {
    "symbol": "TEKTU",
    "name": "Tek-Art İnşaat"
  },
  {
    "symbol": "TKFEN",
    "name": "Tekfen Holding"
  },
  {
    "symbol": "TKNSA",
    "name": "Teknosa"
  },
  {
    "symbol": "TMPOL",
    "name": "Temapol"
  },
  {
    "symbol": "TERA",
    "name": "Tera Yatırım"
  },
  {
    "symbol": "TEHOL",
    "name": "Tera Yatırım Teknoloji Holding"
  },
  {
    "symbol": "TRHOL",
    "name": "Tera Finansal Yatırımlar Holding"
  },
  {
    "symbol": "TGSAS",
    "name": "TGS Dış Ticaret"
  },
  {
    "symbol": "TLMAN",
    "name": "Trabzon Liman"
  },
  {
    "symbol": "TSPOR",
    "name": "Trabzonspor"
  },
  {
    "symbol": "TRMET",
    "name": "TR Anadolu Metal Madencilik"
  },
  {
    "symbol": "TRENJ",
    "name": "TR Doğal Enerji"
  },
  {
    "symbol": "TRILC",
    "name": "Turk İlaç"
  },
  {
    "symbol": "TRGYO",
    "name": "Torunlar GYO"
  },
  {
    "symbol": "TSGYO",
    "name": "TSKB GYO"
  },
  {
    "symbol": "TSKB",
    "name": "TSKB"
  },
  {
    "symbol": "TUCLK",
    "name": "Tuğçelik"
  },
  {
    "symbol": "TUKAS",
    "name": "Tukaş"
  },
  {
    "symbol": "TRCAS",
    "name": "Turcas Holding"
  },
  {
    "symbol": "TUREX",
    "name": "Tureks Turizm"
  },
  {
    "symbol": "MARBL",
    "name": "Tureks Turunç Madencilik"
  },
  {
    "symbol": "TMSN",
    "name": "Tümosan"
  },
  {
    "symbol": "TRALT",
    "name": "Türk Altın İşletmeleri"
  },
  {
    "symbol": "TTKOM",
    "name": "Türk Telekom"
  },
  {
    "symbol": "TTRAK",
    "name": "Türk Traktör"
  },
  {
    "symbol": "TURSG",
    "name": "Türkiye Sigorta"
  },
  {
    "symbol": "TURGG",
    "name": "Türker Proje GYO"
  },
  {
    "symbol": "PRKAB",
    "name": "Türk Prysmian Kablo"
  },
  {
    "symbol": "TBORG",
    "name": "Türk Tuborg"
  },
  {
    "symbol": "UFUK",
    "name": "Ufuk Yatırım"
  },
  {
    "symbol": "ULAS",
    "name": "Ulaşlar Turizm"
  },
  {
    "symbol": "ULUFA",
    "name": "Ulusal Faktoring"
  },
  {
    "symbol": "ULUSE",
    "name": "Ulusoy Elektrik"
  },
  {
    "symbol": "ULUUN",
    "name": "Ulusoy Un"
  },
  {
    "symbol": "UMPAS",
    "name": "Umpaş Holding"
  },
  {
    "symbol": "USAK",
    "name": "Uşak Seramik"
  },
  {
    "symbol": "UCAYM",
    "name": "Üçay Mühendislik"
  },
  {
    "symbol": "ULKER",
    "name": "Ülker Bisküvi"
  },
  {
    "symbol": "UNLU",
    "name": "Ünlü Yatırım Holding"
  },
  {
    "symbol": "VAKBN",
    "name": "VakıfBank"
  },
  {
    "symbol": "VAKFA",
    "name": "Vakıf Faktoring"
  },
  {
    "symbol": "VAKFN",
    "name": "Vakıf Finansal Kiralama"
  },
  {
    "symbol": "VKGYO",
    "name": "Vakıf GYO"
  },
  {
    "symbol": "VAKKO",
    "name": "Vakko"
  },
  {
    "symbol": "VANGD",
    "name": "Vanet Gıda"
  },
  {
    "symbol": "VBTYZ",
    "name": "VBT Yazılım"
  },
  {
    "symbol": "VRGYO",
    "name": "Vera Konsept GYO"
  },
  {
    "symbol": "VERUS",
    "name": "Verusa Holding"
  },
  {
    "symbol": "VERTU",
    "name": "Verusaturk GSYO"
  },
  {
    "symbol": "VESBE",
    "name": "Vestel Beyaz Eşya"
  },
  {
    "symbol": "VESTL",
    "name": "Vestel Elektronik"
  },
  {
    "symbol": "VKFYO",
    "name": "Vakıf Menkul Kıymet Yatırım Ortaklığı"
  },
  {
    "symbol": "VKING",
    "name": "Viking Kağıt"
  },
  {
    "symbol": "VSNMD",
    "name": "Vişne Madencilik"
  },
  {
    "symbol": "YAPRK",
    "name": "Yaprak Süt"
  },
  {
    "symbol": "YATAS",
    "name": "Yataş"
  },
  {
    "symbol": "YAYLA",
    "name": "Yayla Enerji"
  },
  {
    "symbol": "YYLGD",
    "name": "Yayla Agro Gıda"
  },
  {
    "symbol": "YGGYO",
    "name": "Yeni Gimat GYO"
  },
  {
    "symbol": "YEOTK",
    "name": "YEO Teknoloji"
  },
  {
    "symbol": "YESIL",
    "name": "Yeşil Yatırım Holding"
  },
  {
    "symbol": "YYAPI",
    "name": "Yeşil Yapı"
  },
  {
    "symbol": "YBTAS",
    "name": "Yibitaş Yozgat"
  },
  {
    "symbol": "YIGIT",
    "name": "Yiğit Akü"
  },
  {
    "symbol": "YKSLN",
    "name": "Yükselen Çelik"
  },
  {
    "symbol": "YONGA",
    "name": "Yonga Mobilya"
  },
  {
    "symbol": "YUNSA",
    "name": "Yünsa"
  },
  {
    "symbol": "ZEDUR",
    "name": "Zedur Enerji"
  },
  {
    "symbol": "ZERGY",
    "name": "Zeray GYO"
  },
  {
    "symbol": "ZGYO",
    "name": "Z GYO"
  },
  {
    "symbol": "ZRGYO",
    "name": "Ziraat GYO"
  },
  {
    "symbol": "ZOREN",
    "name": "Zorlu Enerji"
  }
];
