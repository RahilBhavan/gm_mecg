"""Alternate automotive supply chain Excel builder using CATEGORIZED data.

Uses include/exclude status, tier (1 or 2), and optional parts/oems/duns per company.
Primary pipeline is build_auto_excel.py (latest_quarter_financials.json + FINANCIALS fallback);
this module provides a different data source and sheet logic when needed.
"""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers
from openpyxl.utils import get_column_letter
from openpyxl.styles.numbers import FORMAT_NUMBER_COMMA_SEP1

# ─────────────────────────────────────────────────────────────────────────────
# INCLUDE / EXCLUDE CATEGORIZATION
# ─────────────────────────────────────────────────────────────────────────────
# status: "include" or "exclude"; tier: 1 or 2 (for includes only); optional parts, oems, duns.

CATEGORIZED = {
    # ── CLEAR EXCLUDES ──────────────────────────────────────────────────────
    "APOLLO GLOBAL MANAGEMENT INC":     {"status": "exclude", "reason": "Private equity / asset manager"},
    "EXXON MOBIL CORP":                 {"status": "exclude", "reason": "Oil & gas — no physical auto components"},
    "TOTALENERGIES SE":                 {"status": "exclude", "reason": "Oil & gas — no physical auto components"},
    "SHELL PLC":                        {"status": "exclude", "reason": "Oil & gas — no physical auto components"},
    "PHILLIPS 66":                      {"status": "exclude", "reason": "Oil & gas refiner — no physical auto components"},
    "ICAHN ENTERPRISES LP":             {"status": "exclude", "reason": "Diversified holding company / PE"},
    "BERKSHIRE HATHAWAY INC":           {"status": "exclude", "reason": "Holding company / financial conglomerate"},
    "BANK OF NOVA SCOTIA, THE":         {"status": "exclude", "reason": "Bank — financial services"},
    "KKR & CO INC":                     {"status": "exclude", "reason": "Private equity / asset manager"},
    "VOLKSWAGEN AG":                    {"status": "exclude", "reason": "OEM (vehicle manufacturer, not supplier)"},
    "HONDA MOTOR CO LTD":               {"status": "exclude", "reason": "OEM (vehicle manufacturer, not supplier)"},
    "TOYOTA MOTOR CORP":                {"status": "exclude", "reason": "OEM (vehicle manufacturer, not supplier)"},
    "NISSAN MOTOR CO LTD":              {"status": "exclude", "reason": "OEM (vehicle manufacturer, not supplier)"},
    "FORD MOTOR CO":                    {"status": "exclude", "reason": "OEM (vehicle manufacturer, not supplier)"},
    "ISUZU MOTORS LIMITED":             {"status": "exclude", "reason": "OEM (vehicle manufacturer, not supplier)"},
    "SHANGHAI AUTOMOTIVE INDUSTRY CORP G": {"status": "exclude", "reason": "OEM (SAIC — vehicle manufacturer)"},
    "MARUBENI-ITOCHU STEEL INC":        {"status": "exclude", "reason": "Steel trading company — not a manufacturer"},
    "ITOCHU CORP":                      {"status": "exclude", "reason": "General trading company — not a manufacturer"},
    "TOYOTA TSUSHO CORP":               {"status": "exclude", "reason": "Trading company — not a manufacturer"},
    "SUMITOMO CORP":                    {"status": "exclude", "reason": "General trading company — not a manufacturer"},
    "KANEMATSU CORP":                   {"status": "exclude", "reason": "Trading company — not a manufacturer"},
    "GRUPO CARSO SAB DE CV":            {"status": "exclude", "reason": "Diversified conglomerate (telecom, retail, industrial) — not auto-focused manufacturer"},
    "CITIC LIMITED":                    {"status": "exclude", "reason": "State-owned conglomerate (financial, energy, mining) — not auto component manufacturer"},
    "IDEMITSU KOSAN CO LTD":            {"status": "exclude", "reason": "Petroleum / oil company"},
    "EMERSON ELECTRIC CO":              {"status": "exclude", "reason": "Industrial automation — no meaningful automotive physical components"},
    "DEERE & CO":                       {"status": "exclude", "reason": "Agricultural / construction equipment OEM"},
    "CAPITAL SOUTHWEST CORP":           {"status": "exclude", "reason": "Business development company (BDC) / financial"},
    "VONTIER CORP":                     {"status": "exclude", "reason": "Vehicle software / telematics — no physical auto components"},
    "MOTOROLA SOLUTIONS INC":           {"status": "exclude", "reason": "Public safety communications — not auto components"},
    "3I GROUP PLC":                     {"status": "exclude", "reason": "Private equity / infrastructure investor"},
    "COMPASS DIVERSIFIED HOLDINGS":     {"status": "exclude", "reason": "Diversified holding company — no direct auto manufacturing"},
    "CADRE HOLDINGS INC":               {"status": "exclude", "reason": "Law enforcement / safety equipment — not automotive"},
    "TRIMBLE INC":                      {"status": "exclude", "reason": "Positioning technology / software — not physical auto components"},
    "ULTRALIFE CORP":                   {"status": "exclude", "reason": "Military & medical batteries — not automotive components"},
    "ARROW ELECTRONICS INC":            {"status": "exclude", "reason": "Electronics distributor — not a manufacturer"},
    "AVNET INC":                        {"status": "exclude", "reason": "Electronics distributor — not a manufacturer"},
    "CCL INDUSTRIES INC":               {"status": "exclude", "reason": "Label / packaging solutions — not auto components"},
    "SONOCO PRODUCTS CO":               {"status": "exclude", "reason": "Industrial packaging — not auto components"},
    "AVERY DENNISON CORP":              {"status": "exclude", "reason": "Label / RFID / packaging — not physical auto components"},
    "SHERWIN-WILLIAMS CO, THE":         {"status": "exclude", "reason": "Paint & coatings — primarily retail/architecture, minimal direct auto component supply"},
    "ATLAS COPCO AB":                   {"status": "exclude", "reason": "Industrial tools / compressors — not auto components"},
    "JOHNSON CONTROLS INC":             {"status": "exclude", "reason": "Building management systems — sold automotive battery division; no longer auto components supplier"},
    "DOVER CORPORATION":                {"status": "exclude", "reason": "Diversified industrial — no primary automotive physical component segment"},
    "WESTINGHOUSE AIR BRAKE TECHNOLOGIES": {"status": "exclude", "reason": "Rail equipment — not automotive"},
    "SCHNEIDER ELECTRIC SE":            {"status": "exclude", "reason": "Building energy management — not auto components"},
    "SIEMENS AKTIENGESELLSCHAFT":       {"status": "exclude", "reason": "Industrial conglomerate — Siemens Automotive divested; not primarily auto components"},
    "FORTIVE CORPORATION":              {"status": "exclude", "reason": "Industrial tech / SaaS — not physical auto components"},
    "MUELLER INDUSTRIES INC":           {"status": "exclude", "reason": "Copper products / HVAC — not automotive focused"},
    "AMG ADVANCED METALLURGICAL GRP NV": {"status": "exclude", "reason": "Specialty metals for aerospace/energy — not primary auto component supplier"},
    "TEXTRON INC":                      {"status": "exclude", "reason": "Aviation (Cessna/Bell) + defense — auto content is immaterial"},
    "REGAL REXNORD CORPORATION":        {"status": "exclude", "reason": "Industrial motors — not primary auto component supplier"},
    "6269633":                          {"status": "exclude", "reason": "Industrial"},  # EMERSON fallback
    "VAPOR ACQUISITION CORP":           {"status": "exclude", "reason": "Holding / SPAC — no operational auto component business identified"},
    "AEQUITA SE & CO KGAA":             {"status": "exclude", "reason": "Investment holding company — no operating auto component business identified"},
    "MITSUBISHI GAS CHEMICAL CO INC":   {"status": "exclude", "reason": "Industrial chemicals — automotive use is minor/indirect"},
    "ENERSYS":                          {"status": "exclude", "reason": "Industrial/telecom batteries — not primarily automotive"},
    "LUXSHARE LTD":                     {"status": "exclude", "reason": "Primarily Apple/consumer electronics supply chain — auto division immaterial"},
    "SONY CORP":                        {"status": "exclude", "reason": "Consumer electronics — automotive sensors are a minor segment"},
    "MITSUBISHI HEAVY INDUSTRIES LTD":  {"status": "exclude", "reason": "Defense / energy / ships — automotive turbo contribution immaterial"},
    "QUANTA COMPUTER INC":              {"status": "exclude", "reason": "IT hardware / servers — auto EMS is immaterial portion"},
    "AVIENT CORPORATION":               {"status": "exclude", "reason": "Specialty polymer distribution — not direct auto component manufacturer"},
    "ARB CORP LTD":                     {"status": "exclude", "reason": "Off-road accessories aftermarket — not OEM automotive supply chain"},
    "DOMETIC GROUP AB (PUBL)":          {"status": "exclude", "reason": "RV / marine climate control — not OEM automotive supplier"},
    "ZHUZHOU TIMES NEW MATERIAL TECHNOLO": {"status": "exclude", "reason": "Rail / wind composites — automotive use immaterial"},
    "DUPONT DE NEMOURS INC":            {"status": "exclude", "reason": "Diversified materials — automotive segment is small relative to total; primary identifier is specialty chemicals not auto parts"},
    "LEM HOLDING SA":                   {"status": "exclude", "reason": "Industrial current sensors — auto segment is small"},

    # ── INCLUDES ────────────────────────────────────────────────────────────
    # Tier 1 = >~$2B revenue, direct OEM customer
    # Tier 2 = component/sub-assembly supplier

    "MAGNA INTERNATIONAL INC":          {"status": "include", "tier": 1, "duns": 201516002,
        "parts": "Body/chassis stampings, seating systems, exterior mirrors, powertrain components, vision systems, roof systems, closures",
        "oems": "General Motors, Ford, Stellantis, Tesla, Honda, Toyota"},

    "DENSO CORPORATION":                {"status": "include", "tier": 1, "duns": 690597851,
        "parts": "HVAC systems, fuel injection systems, starters, alternators, EV motors, thermal management, sensors",
        "oems": "Toyota, Honda, Nissan, Subaru, Mazda, General Motors"},

    "CONTINENTAL AKTIENGESELLSCHAFT":   {"status": "include", "tier": 1, "duns": 315674267,
        "parts": "Tires, brakes, powertrain electronics, ADAS sensors, instrument clusters, CVT belts",
        "oems": "Volkswagen, Mercedes, BMW, Tesla, Stellantis, General Motors"},

    "AISIN CORP":                       {"status": "include", "tier": 1, "duns": 690535588,
        "parts": "Automatic transmissions, torque converters, door/body hardware, water pumps, brakes",
        "oems": "Toyota, Volkswagen, BMW, Stellantis"},

    "VALEO":                            {"status": "include", "tier": 1, "duns": 275242212,
        "parts": "Lighting systems, wiper systems, thermal systems, ADAS sensors, EV charging equipment, clutch modules",
        "oems": "Volkswagen, BMW, Mercedes, Renault, Volvo, General Motors"},

    "FAURECIA":                         {"status": "include", "tier": 1, "duns": 275124311,
        "parts": "Seating frames & mechanisms, acoustic packages, exhaust systems, hydrogen storage tanks, cockpit modules",
        "oems": "Volkswagen, BMW, Ford, General Motors, Stellantis, Renault"},

    "HYUNDAI MOBIS CO LTD":             {"status": "include", "tier": 1, "duns": 687755488,
        "parts": "Chassis modules, front/rear axle modules, airbag systems, instrument panels, EV battery packs",
        "oems": "Hyundai, Kia"},

    "LEAR CORP":                        {"status": "include", "tier": 1, "duns": 175592476,
        "parts": "Seat systems, seat mechanisms, seat foam & trim, e-systems junction boxes, wiring harnesses",
        "oems": "General Motors, Ford, BMW, Volkswagen"},

    "BORGWARNER INC":                   {"status": "include", "tier": 1, "duns": 139469787,
        "parts": "Turbochargers, torque transfer systems, EV drive modules, battery packs, iDM systems",
        "oems": "General Motors, Ford, Toyota, Stellantis, Volkswagen"},

    "ADIENT PUBLIC LTD CO":             {"status": "include", "tier": 1, "duns": 985655816,
        "parts": "Seat frames, seat mechanisms, seat foam, seat trim/fabric, complete seat assemblies",
        "oems": "Ford, General Motors, Stellantis, Volkswagen, BMW"},

    "COMPAGNIE GENERALE DES ETABLISSEMEN": {"status": "include", "tier": 1, "duns": 281938431,
        "parts": "Passenger tires, truck tires, OTR tires, specialty tires, tire accessories",
        "oems": "Volkswagen, Mercedes, BMW, Tesla, Stellantis, Renault"},

    "AUTOLIV INC":                      {"status": "include", "tier": 1, "duns": 76854327,
        "parts": "Airbags, seatbelts, steering wheels, pretensioners, pedestrian protection",
        "oems": "Hyundai, Honda, Toyota, Stellantis, Volkswagen, Mercedes"},

    "NIPPON STEEL CORPORATION":         {"status": "include", "tier": 1, "duns": 690570072,
        "parts": "High-strength steel sheet, galvanized steel, electrical steel, steel tubes",
        "oems": "Toyota, Honda, Nissan, General Motors"},

    "SUMITOMO ELECTRIC INDUSTRIES LTD": {"status": "include", "tier": 1, "duns": 690556345,
        "parts": "Wiring harnesses, optical fiber cables, power cables, brake hoses",
        "oems": "Toyota, Honda, Volkswagen"},

    "GOODYEAR TIRE & RUBBER CO, THE":   {"status": "include", "tier": 1, "duns": 4467924,
        "parts": "Passenger tires, truck tires, run-flat tires, off-road tires",
        "oems": "General Motors, Ford, Stellantis, Volkswagen, Audi"},

    "ARCELORMITTAL":                    {"status": "include", "tier": 1, "duns": 400020397,
        "parts": "Ultra-high-strength steel, dual-phase steel, galvanized steel, steel tube",
        "oems": "General Motors, Ford, Stellantis"},

    "NUCOR CORP":                       {"status": "include", "tier": 1, "duns": 3446796,
        "parts": "Flat-rolled steel sheet, steel bars, structural steel",
        "oems": "General Motors, Mercedes"},

    "NEXTEER AUTOMOTIVE GROUP LTD":     {"status": "include", "tier": 1, "duns": 864421750,
        "parts": "Electric power steering systems, rack & pinion assemblies, driveshafts, steering columns",
        "oems": "General Motors, Ford, Stellantis, BMW, Volkswagen"},

    "CLEVELAND CLIFFS INC":             {"status": "include", "tier": 1, "duns": 147964571,
        "parts": "Advanced high-strength steel, galvanized steel sheet, automotive steel stampings",
        "oems": "General Motors, Ford, Stellantis, Toyota"},

    "LINAMAR CORP":                     {"status": "include", "tier": 1, "duns": 209831544,
        "parts": "Powertrain components, driveline systems, EV structural components, precision machined parts",
        "oems": "General Motors, Ford, Stellantis, Volkswagen, Tesla"},

    "MARTINREA INTERNATIONAL INC":      {"status": "include", "tier": 1, "duns": 252027883,
        "parts": "Metal stampings, structural assemblies, fluid management modules, bumper systems",
        "oems": "General Motors, Ford, Stellantis, BMW, Volkswagen"},

    "BURELLE":                          {"status": "include", "tier": 1, "duns": 281213280,
        "parts": "Bumper fascia, body panels, fuel systems, hydrogen storage modules (Plastic Omnium)",
        "oems": "Volkswagen, Audi, BMW, Mercedes, Stellantis, Renault"},

    "ALFA SAB DE CV":                   {"status": "include", "tier": 1, "duns": 812278687,
        "parts": "Aluminum cylinder heads, engine blocks, EV battery housings, aluminum castings (Nemak)",
        "oems": "General Motors, Ford, Stellantis, BMW, Mercedes"},

    "THYSSENKRUPP AG":                  {"status": "include", "tier": 1, "duns": 340502442,
        "parts": "Automotive steel, springs, stabilizer bars, steering systems, camshafts",
        "oems": "Mercedes, BMW, Audi, Tesla"},

    "TE CONNECTIVITY LTD":              {"status": "include", "tier": 1, "duns": 485203835,
        "parts": "EV connectors, high-voltage harness connectors, relays, sensors, antennae",
        "oems": "General Motors, BMW, Ford, Toyota, Tesla, Volkswagen"},

    "DANA INC":                         {"status": "include", "tier": 1, "duns": 809105351,
        "parts": "Driveshafts, axles, electric drive units, thermal management, sealing solutions",
        "oems": "Ford, Stellantis, Toyota"},

    "EATON CORPORATION PUBLIC LTD CO":  {"status": "include", "tier": 1, "duns": 985419987,
        "parts": "Transmission systems, vehicle power distribution, EV charging & control",
        "oems": "General Motors"},

    "ILLINOIS TOOL WORKS INC":          {"status": "include", "tier": 1, "duns": 5146428,
        "parts": "Automotive fasteners, polymers, fluids, welding equipment for OEM assembly",
        "oems": "General Motors, Toyota, Ford, Volkswagen, BMW, Tesla"},

    "AISIN CORP":                       {"status": "include", "tier": 1, "duns": 690535588,
        "parts": "Automatic transmissions, door hardware, water pumps, brakes, EV drive units",
        "oems": "Toyota, Volkswagen, BMW, Stellantis"},

    "HITACHI LTD":                      {"status": "include", "tier": 1, "duns": 690541503,
        "parts": "EV inverters, motors, e-axles, ADAS radar, steering systems (Astemo JV)",
        "oems": "General Motors, Nissan, Ford, Volkswagen, Toyota"},

    "POSCO HOLDINGS INC":               {"status": "include", "tier": 1, "duns": 687741991,
        "parts": "Automotive high-strength steel, EV battery steel cases, electrical steel",
        "oems": "Hyundai, Kia, General Motors, Ford, Tesla"},

    "ALLISON TRANSMISSION HOLDINGS INC": {"status": "include", "tier": 1, "duns": 969132880,
        "parts": "Fully-automatic transmissions for medium/heavy trucks and buses",
        "oems": "Volvo"},

    "AB SKF":                           {"status": "include", "tier": 1, "duns": 353945744,
        "parts": "Wheel-end bearings, hub bearing units, seals, electric motor bearings",
        "oems": "Volkswagen, BMW, Ford, General Motors"},

    "NIDEC CORP":                       {"status": "include", "tier": 1, "duns": 690635255,
        "parts": "EV traction motors, e-axles, EPS motors, blower motors, precision motors",
        "oems": "Toyota, Honda, Stellantis, General Motors, Ford"},

    "PARKER-HANNIFIN CORPORATION":      {"status": "include", "tier": 1, "duns": 4175550,
        "parts": "Fluid connectors, hydraulic systems, filtration, thermal management, sealing",
        "oems": "General Motors, Ford, Volkswagen, Hyundai, Stellantis"},

    "VITESCO TECHNOLOGIES GROUP AG":    {"status": "include", "tier": 1, "duns": 343056307,
        "parts": "EV power electronics, e-axle drive systems, emission control, battery management",
        "oems": "Volkswagen, Hyundai, Renault, Ford, General Motors"},

    "MELROSE INDUSTRIES PLC":           {"status": "include", "tier": 1, "duns": 221150144,
        "parts": "Driveshafts, sideshafts, eDrive units, powder metal components (GKN Automotive)",
        "oems": "BMW, Mercedes, Volkswagen, Toyota"},

    "HANKOOK & COMPANY CO LTD":         {"status": "include", "tier": 1, "duns": 687735407,
        "parts": "Passenger tires, performance tires, EV-specific tires",
        "oems": "Tesla, BMW, Hyundai, Kia"},

    "PIRELLI & CO SPA":                 {"status": "include", "tier": 1, "duns": 436854350,
        "parts": "High-performance tires, run-flat tires, EV tires, motorsport tires",
        "oems": "BMW, Mercedes, Audi"},

    "CHENG SHIN RUBBER INDUSTRIAL CO LTD": {"status": "include", "tier": 1, "duns": 656000718,
        "parts": "Tires (passenger, truck, off-road), bicycle tires",
        "oems": "General Motors, Ford, Toyota, Nissan"},

    "TOYO TIRE CORPORATION":            {"status": "include", "tier": 1, "duns": 690557053,
        "parts": "Passenger tires, light truck tires, performance tires",
        "oems": "Toyota, Mazda, Audi, Ford"},

    "YOKOHAMA RUBBER CO LTD, THE":      {"status": "include", "tier": 1, "duns": 690565601,
        "parts": "Passenger tires, SUV tires, winter tires, industrial hoses",
        "oems": "Toyota, Mazda, Mercedes"},

    "FUYAO GLASS INDUSTRY GROUP CO LTD": {"status": "include", "tier": 1, "duns": 654532019,
        "parts": "Windshields, side windows, rear windows, laminated safety glass",
        "oems": "Volkswagen, General Motors, Ford, Toyota, Tesla, Stellantis"},

    "NIPPON SHEET GLASS CO LTD":        {"status": "include", "tier": 1, "duns": 690555925,
        "parts": "Automotive laminated glass, tempered glass, solar-control glass",
        "oems": "Toyota, Honda, Volkswagen, Nissan, General Motors"},

    "AGC INC":                          {"status": "include", "tier": 1, "duns": 690553888,
        "parts": "Windshields, side glass, HUD glass, acoustic laminated glass",
        "oems": "BMW, Volkswagen, Mercedes, General Motors, Tesla"},

    "CENTRAL GLASS CO LTD":             {"status": "include", "tier": 1, "duns": 690544317,
        "parts": "Automotive glass, windshields, rear windows",
        "oems": "Toyota, Honda, Nissan, Mazda"},

    "GARRETT MOTION INC":               {"status": "include", "tier": 1, "duns": 81174775,
        "parts": "Turbochargers, e-turbo systems, electric compressors",
        "oems": "Ford, Volkswagen, BMW, Mercedes, Toyota"},

    "SENSATA TECHNOLOGIES HOLDING PLC": {"status": "include", "tier": 1, "duns": 223144058,
        "parts": "Pressure sensors, temperature sensors, position sensors, EV battery sensors",
        "oems": "Tesla, General Motors, Ford, Volkswagen, Volvo"},

    "VISTEON CORP":                     {"status": "include", "tier": 1, "duns": 183727804,
        "parts": "Digital instrument clusters, infotainment head units, connected car systems",
        "oems": "General Motors, Ford, Stellantis, Hyundai, Kia, Nissan"},

    "AMERICAN AXLE & MANUFACTURING":    {"status": "include", "tier": 1, "duns": 44766678,
        "parts": "Driveshafts, axles, driveline modules, EV electric drive units",
        "oems": "General Motors, Ford, Stellantis"},

    "COOPER STANDARD HOLDINGS INC":     {"status": "include", "tier": 1, "duns": 361293918,
        "parts": "Door & window sealing systems, fuel & brake hoses, fluid transfer systems",
        "oems": "General Motors, Ford, Stellantis, Volkswagen, Mercedes"},

    "GENTHERM INC":                     {"status": "include", "tier": 1, "duns": 556879252,
        "parts": "Heated/cooled/ventilated seats, battery thermal management, steering wheel heaters",
        "oems": "Ford, General Motors, Toyota, Stellantis, Tesla"},

    "GENTEX CORP":                      {"status": "include", "tier": 2, "duns": 65855363,
        "parts": "Auto-dimming mirrors, HomeLink garage transmitter, full display mirrors",
        "oems": "Volkswagen, Mercedes, BMW, Toyota"},

    "TIMKENSTEEL CORPORATION":          {"status": "include", "tier": 2, "duns": 79236657,
        "parts": "Specialty steel bars, seamless steel tubes for drivetrain applications",
        "oems": "General Motors, Ford, Stellantis"},

    "TIMKEN CO, THE":                   {"status": "include", "tier": 2, "duns": 4465100,
        "parts": "Tapered roller bearings, spherical roller bearings, driveshaft bearings",
        "oems": "General Motors"},

    "ELRINGKLINGER AG":                 {"status": "include", "tier": 2, "duns": 315342345,
        "parts": "Cylinder head gaskets, special gaskets, shielding, EV battery cell frames",
        "oems": "Volkswagen, Mercedes, BMW, Tesla"},

    "SUNGWOO HITECH CO LTD":            {"status": "include", "tier": 2, "duns": 689285091,
        "parts": "Hot-stamped metal stampings, door rings, B-pillars, floor panels",
        "oems": "Kia, Hyundai, Volkswagen, General Motors"},

    "MINTH GROUP LTD":                  {"status": "include", "tier": 2, "duns": 864393322,
        "parts": "Decorative trim strips, door frame sealing, EV battery enclosures, structural parts",
        "oems": "Tesla, General Motors, Toyota, Mercedes, Volkswagen"},

    "NEXANS SA":                        {"status": "include", "tier": 2, "duns": 738162205,
        "parts": "High-voltage EV cables, low-voltage wiring harnesses, charging cables",
        "oems": "Stellantis, Volkswagen, BMW, Mercedes"},

    "NITERRA CO LTD":                   {"status": "include", "tier": 2, "duns": 690569256,
        "parts": "Spark plugs, glow plugs, oxygen sensors, temperature sensors",
        "oems": "Toyota, Honda, Volkswagen, Ford, General Motors"},

    "PARK-OHIO HOLDINGS CORP":          {"status": "include", "tier": 2, "duns": 49746014,
        "parts": "Engineered fasteners, assembly components, supply chain management",
        "oems": "General Motors, Ford, Stellantis"},

    "KOITO MANUFACTURING CO LTD":       {"status": "include", "tier": 2, "duns": 690579347,
        "parts": "Headlamps, taillamps, fog lamps, LED lighting assemblies",
        "oems": "Toyota, Honda, Subaru"},

    "CIE AUTOMOTIVE SA":                {"status": "include", "tier": 2, "duns": 471743500,
        "parts": "Metal stamped parts, aluminum castings, forge components, plastic/composite parts",
        "oems": "Volkswagen, Stellantis, Ford, BMW, General Motors"},

    "TI FLUID SYSTEMS PLC":             {"status": "include", "tier": 2, "duns": 220607205,
        "parts": "Fuel delivery systems, brake & fluid lines, thermal management tubes",
        "oems": "Volkswagen, Stellantis, Ford, BMW, General Motors"},

    "EXEDY CORPORATION":                {"status": "include", "tier": 2, "duns": 690554894,
        "parts": "Clutch covers, clutch discs, torque converters, flywheels",
        "oems": "Toyota, Honda, Nissan, Subaru"},

    "IOCHPE MAXION SA":                 {"status": "include", "tier": 2, "duns": 898699483,
        "parts": "Steel wheels, aluminum wheels, truck chassis frames",
        "oems": "Volkswagen, Stellantis, General Motors, Ford, Toyota"},

    "TOPY INDUSTRIES LTD":              {"status": "include", "tier": 2, "duns": 690544341,
        "parts": "Steel wheels, wheel rims, forged products",
        "oems": "General Motors, Toyota, Ford, Honda, Nissan, Stellantis"},

    "SSAB AB":                          {"status": "include", "tier": 2, "duns": 353957822,
        "parts": "High-strength steel sheet, wear-resistant steel, structural steel",
        "oems": "Volvo"},

    "NINGBO JIFENG AUTO PARTS CO LTD":  {"status": "include", "tier": 2, "duns": 527651909,
        "parts": "Automotive seat components, headrests, armrests, seat structural parts",
        "oems": "BMW, Audi, Volkswagen, General Motors, Tesla, Ford"},

    "AMPHENOL CORP":                    {"status": "include", "tier": 2, "duns": 177220647,
        "parts": "High-voltage EV connectors, sensor connectors, automotive antenna assemblies",
        "oems": "General Motors, Audi, BMW, Nissan"},

    "LG ELECTRONICS INC":              {"status": "include", "tier": 1, "duns": 688298116,
        "parts": "EV traction motors, infotainment systems, EV chargers, ADAS cameras",
        "oems": "General Motors, Toyota, Hyundai, Mercedes, Renault"},

    "TSUBAKIMOTO CHAIN CO":             {"status": "include", "tier": 2, "duns": 690555214,
        "parts": "Engine timing chains, drive chains, cam phasers, automotive chain systems",
        "oems": "Toyota, Ford, General Motors, Nissan, Honda"},

    "STABILUS SA":                      {"status": "include", "tier": 2, "duns": 400652919,
        "parts": "Gas springs, power struts, liftgate actuators, trunk lifters",
        "oems": "Volkswagen, BMW, Ford, Tesla, General Motors"},

    "LEGGETT & PLATT INC":              {"status": "include", "tier": 2, "duns": 7140064,
        "parts": "Seat suspension systems, lumbar supports, seat comfort structures",
        "oems": "General Motors, Toyota, Ford"},

    "PRYSMIAN SPA":                     {"status": "include", "tier": 2, "duns": 544091510,
        "parts": "High-voltage EV cables, automotive wiring, charging cables",
        "oems": "Ford, Toyota, Stellantis, General Motors, Volkswagen"},

    "COMPAGNIE DE SAINT-GOBAIN":        {"status": "include", "tier": 2, "duns": 275133692,
        "parts": "Automotive glass (via Sekurit), sealing, abrasives",
        "oems": "Volkswagen, BMW, Mercedes, Ford, Toyota, General Motors"},

    "MITSUBISHI STEEL MFG CO LTD":      {"status": "include", "tier": 2, "duns": 690552633,
        "parts": "Suspension springs, stabilizer bars, high-strength springs",
        "oems": "Ford, Stellantis, Volkswagen, BMW, General Motors"},

    "EXCO TECHNOLOGIES LTD":           {"status": "include", "tier": 2, "duns": 201648052,
        "parts": "Extrusion tooling, die casting tooling, auto trim mouldings",
        "oems": "Toyota, Honda, Nissan"},

    "LG CHEM LTD":                      {"status": "include", "tier": 1, "duns": 688279996,
        "parts": "EV battery cells, battery modules, battery packs, cathode materials",
        "oems": "General Motors, Toyota, Tesla"},

    "JTEKT CORP":                       {"status": "include", "tier": 1, "duns": 690535646,
        "parts": "Electric power steering systems, column-type EPS, wheel-end bearings",
        "oems": "Toyota, General Motors"},

    "NIPPON SEIKI CO LTD":              {"status": "include", "tier": 2, "duns": 690673546,
        "parts": "Digital instrument clusters, head-up displays, meters, gauges",
        "oems": "General Motors, Honda, Nissan, Mazda, Subaru, BMW"},

    "WORTHINGTON INDUSTRIES INC":       {"status": "include", "tier": 2, "duns": 4312401,
        "parts": "Pressurized steel cylinders, custom steel processing, auto stampings",
        "oems": "General Motors, Stellantis"},

    "RYOBI LTD":                        {"status": "include", "tier": 2, "duns": 690536123,
        "parts": "Aluminum die castings, transmission cases, engine brackets, structural parts",
        "oems": "Volkswagen, Toyota"},

    "F-TECH INC":                       {"status": "include", "tier": 2, "duns": 690809090,
        "parts": "Pedal assemblies, structural frames, suspension components",
        "oems": "Honda, Nissan, General Motors"},

    "FCC CO LTD":                       {"status": "include", "tier": 2, "duns": 690661756,
        "parts": "Clutch systems, multi-plate clutch packs, ATM clutches",
        "oems": "Honda, Toyota, Ford, General Motors"},

    "METHODE ELECTRONICS INC":          {"status": "include", "tier": 2, "duns": 5092135,
        "parts": "EV bus bars, LED lighting solutions, user interface controls, cable assemblies",
        "oems": "General Motors"},

    "STRATTEC SECURITY CORPORATION":    {"status": "include", "tier": 2, "duns": 879168029,
        "parts": "Locks, keys, vehicle access systems, door handles",
        "oems": "Stellantis, General Motors, Ford"},

    "JOHNSON ELECTRIC HOLDINGS LIMITED": {"status": "include", "tier": 2, "duns": 875648826,
        "parts": "DC motors, actuators, solenoids for windows/doors/HVAC",
        "oems": "Ford, Volkswagen, General Motors"},

    "ALPS ALPINE CO LTD":               {"status": "include", "tier": 2, "duns": 690547641,
        "parts": "Automotive sensors, HMI switches, radar sensors, power window switches",
        "oems": "General Motors, Stellantis, Ford, Volkswagen, Mercedes"},

    "RASSINI SAB DE CV":                {"status": "include", "tier": 2, "duns": 811393222,
        "parts": "Leaf springs, coil springs, brake discs, front suspension systems",
        "oems": "General Motors, Ford, Stellantis, Volkswagen, Toyota"},

    "CONSTELLIUM SE":                   {"status": "include", "tier": 2, "duns": 274121531,
        "parts": "Aluminum auto body sheet, crash management systems, structural profiles",
        "oems": "BMW, Mercedes, Ford, Stellantis"},

    "HINDALCO INDUSTRIES LTD":          {"status": "include", "tier": 2, "duns": 650141922,
        "parts": "Aluminum auto body sheet, flat-rolled aluminum for closures",
        "oems": "Ford, General Motors, BMW"},

    "SIKA AG":                          {"status": "include", "tier": 2, "duns": 480000538,
        "parts": "Structural adhesives, acoustic baffles, seam sealants, battery adhesives for EV",
        "oems": "Volkswagen, Stellantis, Toyota"},

    "SL CORP":                          {"status": "include", "tier": 2, "duns": 687751727,
        "parts": "Interior lighting modules, ambient lighting, exterior lamps",
        "oems": "Hyundai, General Motors, Kia"},

    "GRUPO INDUSTRIAL SALTILLO SA DE CV": {"status": "include", "tier": 2, "duns": 810535872,
        "parts": "Aluminum engine blocks, cylinder heads, EV battery housings",
        "oems": "General Motors, Ford, Stellantis, Volkswagen, Nissan"},

    "STONERIDGE INC":                   {"status": "include", "tier": 2, "duns": 606280873,
        "parts": "Smart mirrors (MirrorEye), tachograph systems, control units",
        "oems": "Ford, General Motors, Stellantis, Toyota"},

    "STANDARD MOTOR PRODUCTS INC":      {"status": "include", "tier": 2, "duns": 1315266,
        "parts": "Ignition coils, sensors, fuel injectors, EGR components, engine management",
        "oems": "Ford, General Motors, Volvo"},

    "T RAD CO LTD":                     {"status": "include", "tier": 2, "duns": 690569751,
        "parts": "Radiators, oil coolers, heat exchangers, EV thermal management modules",
        "oems": "Toyota, Honda, General Motors"},

    "ILJIN GLOBAL CO LTD":              {"status": "include", "tier": 2, "duns": 695687668,
        "parts": "Wheel bearings, hub units, driveshafts",
        "oems": "Hyundai, General Motors, Ford, Kia, Mercedes"},

    "DY CORPORATION":                   {"status": "include", "tier": 2, "duns": 687769307,
        "parts": "Wire harnesses, high-voltage harnesses, connectors",
        "oems": "General Motors, Hyundai, Kia"},

    "AKEBONO BRAKE INDUSTRY CO LTD":    {"status": "include", "tier": 2, "duns": 690535927,
        "parts": "Disc brake pads, drum brake shoes, brake calipers, brake assemblies",
        "oems": "Toyota, Honda, Nissan, Subaru, Mazda, General Motors"},

    "AGC INC":                          {"status": "include", "tier": 1, "duns": 690553888,
        "parts": "Windshields, side glass, HUD glass, acoustic laminated glass",
        "oems": "BMW, Volkswagen, Mercedes, General Motors, Tesla"},

    "AIRBOSS OF AMERICA CORP":          {"status": "include", "tier": 2, "duns": 247865264,
        "parts": "Anti-vibration products, rubber NVH components, body mounts",
        "oems": "General Motors, Ford, Stellantis, Honda"},

    "TAEYANG METAL INDUSTRIAL CO LTD":  {"status": "include", "tier": 2, "duns": 687782458,
        "parts": "Metal stampings, door hinges, hood hinges, structural parts",
        "oems": "Hyundai, Kia, General Motors, Ford, Stellantis, Mazda"},

    "NINGBO HUAXIANG ELECTRONIC CO LTD": {"status": "include", "tier": 2, "duns": 420859670,
        "parts": "Interior plastic parts, panels, handles, console components",
        "oems": "Volkswagen, BMW, Mercedes, Volvo, General Motors"},

    "HYUNDAI WIA CORP":                 {"status": "include", "tier": 1, "duns": 687784926,
        "parts": "Engine systems, drivetrain, axles, machining systems",
        "oems": "Hyundai, Kia, General Motors, Renault, Nissan, Volvo"},

    "BASF SE":                          {"status": "include", "tier": 2, "duns": 315000554,
        "parts": "Automotive coatings, engineering plastics, battery materials, foam",
        "oems": "Mercedes, Volkswagen, Toyota, Tesla"},

    "KOBE STEEL LTD":                   {"status": "include", "tier": 2, "duns": 690535018,
        "parts": "Aluminum alloy sheet, high-strength steel wire rod, forged components",
        "oems": "Toyota, Nissan, Honda, Mazda, Subaru, General Motors"},

    "VOXX INTERNATIONAL CORP":          {"status": "include", "tier": 2, "duns": 44694040,
        "parts": "Remote start systems, vehicle security, rear-seat entertainment, OEM electronics",
        "oems": "Stellantis, Ford, General Motors, Nissan, Subaru"},

    "MOTORCAR PARTS OF AMERICA INC":    {"status": "include", "tier": 2, "duns": 44477123,
        "parts": "Remanufactured alternators, starters, wheel hubs, brake calipers",
        "oems": "General Motors, Ford, Toyota, Honda, Hyundai"},

    "MITSUBISHI MATERIALS CORP":        {"status": "include", "tier": 2, "duns": 690536867,
        "parts": "Cemented carbide cutting tools, copper alloys, aluminum materials",
        "oems": "Toyota, Ford, Nissan, Volkswagen"},

    "HL MANDO CORPORATION":             {"status": "include", "tier": 1, "duns": 688250455,
        "parts": "Brakes, steering systems, suspension, ADAS, electronic control units",
        "oems": "General Motors, Hyundai, Kia, Ford, Nissan, Chrysler"},

    "NINGBO JOYSON ELECTRONIC CORP":    {"status": "include", "tier": 1, "duns": 421342800,
        "parts": "Airbag systems, seatbelts, steering wheels, vehicle software (Key Safety Systems)",
        "oems": "Volkswagen, BMW, Mercedes, General Motors, Tesla"},

    "BHARAT FORGE LTD":                 {"status": "include", "tier": 2, "duns": 650049299,
        "parts": "Forged crankshafts, connecting rods, front axle beams, knuckles",
        "oems": "Volkswagen, Mercedes, Volvo, General Motors, Stellantis"},

    "WESTPORT FUEL SYSTEMS INC":        {"status": "include", "tier": 2, "duns": 252892955,
        "parts": "CNG/LNG fuel systems, HPDI natural gas injectors, hydrogen fuel systems",
        "oems": "General Motors, Ford, Volkswagen, Honda, Hyundai"},

    "TOYOTA BOSHOKU CORP":              {"status": "include", "tier": 1, "duns": 690911185,
        "parts": "Interior systems, seat assemblies, door trim, air filters, fluid purification",
        "oems": "Toyota, Honda, Nissan, BMW, Subaru"},

    "TOYOTA INDUSTRIES CORP":           {"status": "include", "tier": 1, "duns": 691239750,
        "parts": "Compressors, inverters, EV motors, textile machinery (separate)",
        "oems": "Toyota, Tesla, General Motors, Ford, Mercedes"},

    "ENERSYS":                          {"status": "exclude", "reason": "Industrial/telecom batteries — not primarily automotive"},

    "AMPHENOL CORP":                    {"status": "include", "tier": 2, "duns": 177220647,
        "parts": "High-voltage EV connectors, sensor connectors, automotive antenna assemblies",
        "oems": "General Motors, Audi, BMW, Nissan"},

    "NHKSPRING":                        {"status": "include", "tier": 2, "duns": 690541545,
        "parts": "Suspension springs, valve springs, disk springs",
        "oems": "Toyota, Honda, Nissan, Subaru, Mazda, General Motors"},

    "NHK SPRING CO LTD":                {"status": "include", "tier": 2, "duns": 690541545,
        "parts": "Suspension springs, valve springs, disk springs, anti-vibration systems",
        "oems": "Toyota, Honda, Nissan, Subaru, Mazda, General Motors"},

    "TAIHO KOGYO CO LTD":               {"status": "include", "tier": 2, "duns": 690559943,
        "parts": "Engine bearings, sliding bearings, plain bearings",
        "oems": "Toyota, Honda, Nissan, Mitsubishi, General Motors"},

    "LS CORP":                          {"status": "include", "tier": 2, "duns": 687953992,
        "parts": "High-voltage EV cables, wire harnesses, busbars, EV charging cables",
        "oems": "Kia, Ford, Stellantis, Volkswagen, Hyundai, General Motors"},

    "MITSUBA CORP":                     {"status": "include", "tier": 2, "duns": 690658596,
        "parts": "Starter motors, wiper systems, blower motors, door actuators",
        "oems": "Honda, Nissan, Volkswagen, BMW"},

    "LITTELFUSE INC":                   {"status": "include", "tier": 2, "duns": 5212246,
        "parts": "Automotive fuses, circuit protection, EV contactors, sensors",
        "oems": "Tesla"},

    "INFAC CORPORATION":                {"status": "include", "tier": 2, "duns": 687802777,
        "parts": "Metal stampings, door hinges, structural parts",
        "oems": "Hyundai, Kia, General Motors, Mazda"},

    "SANDEN CORPORATION":               {"status": "include", "tier": 2, "duns": 690558051,
        "parts": "Automotive HVAC compressors, EV heat pumps, vending machines",
        "oems": "Toyota, Hyundai, Audi, BMW, Mercedes, Ford, General Motors"},

    "CORE MOLDING TECHNOLOGIES INC":    {"status": "include", "tier": 2, "duns": 965507312,
        "parts": "Fiberglass composite hoods, fenders, roofs, cab panels",
        "oems": "Volvo, Ford, BMW, General Motors"},

    "ZHEJIANG WANFENG AUTO WHEEL CO LTD": {"status": "include", "tier": 2, "duns": 530750454,
        "parts": "Aluminum alloy wheels, magnesium wheels",
        "oems": "Mercedes, BMW, Volkswagen, General Motors, Ford, Stellantis"},

    "DORMAN PRODUCTS INC":              {"status": "include", "tier": 2, "duns": 93715316,
        "parts": "Aftermarket auto parts (brakes, cooling, electrical, chassis)",
        "oems": "Ford, Stellantis, General Motors"},

    "PARKER CORP":                      {"status": "include", "tier": 2, "duns": 690882766,
        "parts": "Auto parts distribution and manufacturing",
        "oems": "General Motors, Ford, Stellantis"},

    "BANDO CHEMICAL INDUSTRIES LTD":    {"status": "include", "tier": 2, "duns": 690579495,
        "parts": "Drive belts, timing belts, ribbed belts",
        "oems": "General Motors"},

    "NSK LTD":                          {"status": "include", "tier": 1, "duns": 690535059,
        "parts": "Ball bearings, tapered roller bearings, EPS steering systems",
        "oems": "Toyota, Honda, Nissan, Suzuki, Mazda, Subaru, General Motors"},

    "SUNDRAM FASTENERS LTD":            {"status": "include", "tier": 2, "duns": 650086143,
        "parts": "High-tensile fasteners, powder metal components, castings",
        "oems": "General Motors, Ford, Volkswagen, Renault, Volvo"},

    "TOKAI RIKA CO LTD":                {"status": "include", "tier": 2, "duns": 690538723,
        "parts": "Steering switches, turn signal levers, shift lock systems, ignition switches",
        "oems": "Toyota, Suzuki, Nissan, General Motors, Ford, Subaru"},

    "HOLLEY INC":                       {"status": "include", "tier": 2, "duns": 117688620,
        "parts": "Performance carburetors, fuel injection, exhaust systems, tuning",
        "oems": "General Motors"},

    "SHANGHAI BAOLONG AUTOMOTIVE CORP": {"status": "include", "tier": 2, "duns": 544792021,
        "parts": "TPMS sensors, valves, inflators, EV thermal expansion valves",
        "oems": "General Motors, Ford, Chrysler, Volkswagen, Mercedes"},

    "AHRESTY CORP":                     {"status": "include", "tier": 2, "duns": 690569579,
        "parts": "Aluminum die castings, transmission cases, engine parts",
        "oems": "General Motors, Toyota, Honda, Nissan, Suzuki, Mazda"},

    "LKQ CORP":                         {"status": "include", "tier": 2, "duns": 28117104,
        "parts": "Aftermarket collision parts, OEM-equivalent parts, salvage vehicles",
        "oems": "N/A"},

    "CONSTELLIUM SE":                   {"status": "include", "tier": 2, "duns": 274121531,
        "parts": "Aluminum auto body sheet, crash management systems, structural profiles",
        "oems": "BMW, Mercedes, Ford, Stellantis"},

    "LEM HOLDING SA":                   {"status": "exclude", "reason": "Industrial current sensors — primary markets are drives/industrial, automotive segment immaterial"},

    "TUPY S/A":                         {"status": "include", "tier": 2, "duns": 898699483,
        "parts": "Gray iron castings, ductile iron castings, engine blocks, cylinder heads",
        "oems": "General Motors, Ford, Stellantis, Volkswagen"},

    "POLYTEC HOLDINGS AG":              {"status": "include", "tier": 2, "duns": 300243545,
        "parts": "Thermoplastic exterior parts, door panels, wheel arch liners, engine covers",
        "oems": "BMW, Volkswagen, Mercedes, Stellantis"},

    "THK CO LTD":                       {"status": "include", "tier": 2, "duns": 690599097,
        "parts": "Linear motion guides, ball screws, automotive actuators",
        "oems": "Toyota, Honda, General Motors"},

    "ZHEJIANG SANHUA INTELLIGENT CONTROL": {"status": "include", "tier": 2, "duns": 544771496,
        "parts": "EV thermal expansion valves, refrigerant valves, heat exchangers",
        "oems": "Toyota, Volkswagen, Tesla"},

    "KONGSBERG AUTOMOTIVE ASA":         {"status": "include", "tier": 2, "duns": 518896162,
        "parts": "Cable systems for gear shift, parking brake, seat position",
        "oems": "Ford, Nissan"},

    "NORMA GROUP SE":                   {"status": "include", "tier": 2, "duns": 506707343,
        "parts": "Clamps, connectors, hose couplings for fluid management",
        "oems": "N/A"},

    "TAIHO KOGYO CO LTD":               {"status": "include", "tier": 2, "duns": 690559943,
        "parts": "Engine bearings, sliding bearings, plain bearings",
        "oems": "Toyota, Honda, Nissan, Mitsubishi, General Motors"},

    "MITSUBA CORP":                     {"status": "include", "tier": 2, "duns": 690658596,
        "parts": "Starter motors, wiper systems, blower motors, door actuators",
        "oems": "Honda, Nissan, Volkswagen, BMW"},

    "HI-LEX CORP":                      {"status": "include", "tier": 2, "duns": 690539358,
        "parts": "Control cables, window regulator cables, seat cables",
        "oems": "Ford, General Motors, Stellantis, Toyota, Honda, Mercedes"},

    "SFS GROUP AG":                     {"status": "include", "tier": 2, "duns": 483367074,
        "parts": "Precision metal fasteners, engineered components for automotive",
        "oems": "Volkswagen"},

    "DEPO AUTO PARTS IND CO LTD":       {"status": "include", "tier": 2, "duns": 656275658,
        "parts": "Aftermarket headlamps, tail lamps, fog lamps",
        "oems": "Toyota, Honda, Nissan, Ford, General Motors, BMW"},

    "XIN POINT HOLDINGS LTD":           {"status": "include", "tier": 2, "duns": 815557373,
        "parts": "Metal trim pieces, side moldings, decorative trim",
        "oems": "General Motors, Mercedes, Volvo, BMW, Ford, Honda"},

    "DIAMOND ELECTRIC HOLDINGS CO LTD": {"status": "include", "tier": 2, "duns": 717684106,
        "parts": "Ignition coils, ignition modules, distributors",
        "oems": "Ford, Subaru, General Motors, Toyota, Honda"},

    "THULE GROUP AB":                   {"status": "include", "tier": 2, "duns": 776631116,
        "parts": "Roof racks, tow bars, bike carriers, cargo boxes",
        "oems": "Volvo, Audi, BMW"},

    "MURO CORPORATION":                 {"status": "include", "tier": 2, "duns": 691458483,
        "parts": "Small metal parts, fasteners, brackets",
        "oems": "Toyota, Honda, Nissan, Mazda, Subaru"},

    "HANWHA CORP":                      {"status": "include", "tier": 2, "duns": 687739466,
        "parts": "Propellant powders, auto steel, industrial explosives (separate)",
        "oems": "Hyundai, BMW, Kia, Mercedes, Volkswagen, General Motors"},

    "DAIDO METAL CO LTD":               {"status": "include", "tier": 2, "duns": 690559257,
        "parts": "Engine plain bearings, thrust washers, large-engine bearings",
        "oems": "Ford, General Motors, Toyota, Honda, Nissan"},

    "JABIL CIRCUIT CO":                 {"status": "include", "tier": 2, "duns": 41810979,
        "parts": "Automotive electronics manufacturing, EV power modules",
        "oems": "Ford, General Motors, Toyota, Honda, Hyundai"},

    "UACJ CORP":                        {"status": "include", "tier": 2, "duns": 690644448,
        "parts": "Aluminum flat-rolled products, aluminum auto body sheet",
        "oems": "General Motors, Toyota, Tesla, Ford, Honda"},

    "MUSASHI SEIMITSU INDUSTRY CO LTD": {"status": "include", "tier": 2, "duns": 690679840,
        "parts": "Forged steel parts, differential gears, EV drivetrain components",
        "oems": "Toyota, Honda, Mitsubishi, Suzuki, General Motors"},

    "FURUKAWA ELECTRIC CO LTD":         {"status": "include", "tier": 1, "duns": 690553763,
        "parts": "Wiring harnesses, fiber optic cables, copper products, EV components",
        "oems": "General Motors, Ford, Stellantis, BYD, Toyota, Honda"},

    "NIFCO INC":                        {"status": "include", "tier": 2, "duns": 690601307,
        "parts": "Plastic fasteners, clips, retainers, trim attachment parts",
        "oems": "General Motors, Ford, Toyota, Stellantis, Tesla, Renault"},

    "ARKEMA":                           {"status": "include", "tier": 2, "duns": 266873780,
        "parts": "Specialty polymer powders, bio-based polyamides, auto lightweighting materials",
        "oems": "Volkswagen, BMW, Stellantis"},

    "SUNDRAM FASTENERS LTD":            {"status": "include", "tier": 2, "duns": 650086143,
        "parts": "High-tensile fasteners, powder metal components, castings",
        "oems": "General Motors, Ford, Volkswagen, Renault, Volvo"},

    "FOSTER ELECTRIC CO LTD":           {"status": "include", "tier": 2, "duns": 690555933,
        "parts": "Speakers, microphones, actuators for automotive",
        "oems": "Toyota, Honda, Nissan, Suzuki, Mazda, Subaru, General Motors"},

    "SANOH INDUSTRIAL CO LTD":          {"status": "include", "tier": 2, "duns": 690773668,
        "parts": "Steel tubes, fuel lines, brake lines, clutch pipes",
        "oems": "Toyota, Nissan, Honda, Mazda"},

    "KYB CORP":                         {"status": "include", "tier": 1, "duns": 690547401,
        "parts": "Shock absorbers, struts, steering gear boxes, EPS systems",
        "oems": "Toyota, Honda, Nissan, Ford, Volkswagen, Subaru"},

    "TSUBAKI NAKASHIMA CO LTD":         {"status": "include", "tier": 2, "duns": 714213373,
        "parts": "Precision steel balls, ball studs, linear motion components",
        "oems": "Toyota, Volkswagen, Ford, Tesla, Honda"},

    "FUJIKURA LTD":                     {"status": "include", "tier": 2, "duns": 690537048,
        "parts": "Wiring harnesses, fiber optic cables, power cables",
        "oems": "Toyota, Honda, Nissan"},

    "TRIMAS CORP":                      {"status": "include", "tier": 2, "duns": 175591072,
        "parts": "Aerospace & auto specialty products, steel parts",
        "oems": "General Motors, Ford, Stellantis"},

    "YOROZU CORP":                      {"status": "include", "tier": 2, "duns": 690845367,
        "parts": "Suspension parts, cross members, front sub-frames",
        "oems": "General Motors, Toyota, Honda, Volkswagen, Nissan"},

    "TT ELECTRONICS PLC":               {"status": "include", "tier": 2, "duns": 212398689,
        "parts": "Position sensors, power electronics, sensors for auto",
        "oems": "BMW, Mercedes"},

    "NISHIKAWA RUBBER CO LTD":          {"status": "include", "tier": 2, "duns": 690578760,
        "parts": "Weather strips, door seals, trunk seals",
        "oems": "Toyota, Honda, Nissan, Mazda"},

    "TRELLEBORG AB":                    {"status": "include", "tier": 2, "duns": 353944689,
        "parts": "Sealing systems, anti-vibration products, engineered coated fabrics",
        "oems": "Stellantis, Volvo, Volkswagen"},

    "BODYCOTE PLC":                     {"status": "include", "tier": 2, "duns": 218145332,
        "parts": "Heat treatment of powertrain gears, bearings, chassis parts",
        "oems": "BMW, Volkswagen"},

    "CTR CO LTD":                       {"status": "include", "tier": 2, "duns": 687819359,
        "parts": "Steering gear, rack & pinion, EPS systems",
        "oems": "Hyundai, Kia, General Motors, Tesla, Ford"},

    "PACIFIC INDUSTRIAL CO LTD":        {"status": "include", "tier": 2, "duns": 690536404,
        "parts": "Tire pressure valves, TPMS valve cores, plastic & rubber parts",
        "oems": "General Motors, Toyota, Honda, Nissan, Ford"},

    "NOK CORPORATION":                  {"status": "include", "tier": 2, "duns": 690550454,
        "parts": "Oil seals, O-rings, sealing solutions, EV motor seals",
        "oems": "Toyota, Nissan, Honda, Volkswagen, General Motors"},

    "SUMITOMO RIKO COMPANY LTD":        {"status": "include", "tier": 2, "duns": 690538541,
        "parts": "Anti-vibration rubber, hoses, sealing products, interior parts",
        "oems": "Honda, Nissan, General Motors, BMW, Mercedes, Mazda"},

    "GMB CORP":                         {"status": "include", "tier": 2, "duns": 690594270,
        "parts": "Universal joints, water pumps, tensioners",
        "oems": "Toyota, Mazda, Nissan, Subaru, Honda, Kia, Hyundai"},

    "KENDRION NV":                      {"status": "include", "tier": 2, "duns": 403394372,
        "parts": "Electromagnetic actuators, solenoids, electromagnetic clutches",
        "oems": "N/A"},

    "TOYODA GOSEI CO LTD":              {"status": "include", "tier": 2, "duns": 690559182,
        "parts": "Weather strips, air bags, steering wheels, hoses, LEDs",
        "oems": "Toyota, Honda, Nissan, Ford, General Motors"},

    "HWASEUNG CORP CO LTD":             {"status": "include", "tier": 2, "duns": 687998617,
        "parts": "Shift cable assemblies, transmission cables, HVAC cables",
        "oems": "Hyundai, Kia, General Motors, Ford, Stellantis, BMW"},

    "JINHAP CO LTD":                    {"status": "include", "tier": 2, "duns": 689283781,
        "parts": "Rubber/plastic auto parts, bushings, grommets",
        "oems": "Hyundai, Kia"},

    "SK INNOVATION CO LTD":             {"status": "include", "tier": 1, "duns": 631064016,
        "parts": "EV battery cells, battery modules, battery management systems",
        "oems": "Ford, Volkswagen, Hyundai, Kia, Mercedes"},

    "NICHIRIN CO LTD":                  {"status": "include", "tier": 2, "duns": 690691068,
        "parts": "Brake hoses, fuel hoses, HVAC hoses",
        "oems": "Honda, Toyota, Nissan"},

    "STANLEY ELECTRIC CO LTD":          {"status": "include", "tier": 2, "duns": 690550637,
        "parts": "Headlamps, taillamps, fog lamps, LED lighting",
        "oems": "Honda, Toyota, Subaru"},

    "LCI INDUSTRIES":                   {"status": "include", "tier": 2, "duns": 7871643,
        "parts": "Chassis components, slide-outs, leveling systems for RVs/trucks",
        "oems": "General Motors, Ford, Stellantis"},

    "CTEK AB (PUBL)":                   {"status": "include", "tier": 2, "duns": 350685597,
        "parts": "Battery chargers, EV charging solutions",
        "oems": "BMW, Volkswagen"},

    "NICHIAS CORP":                     {"status": "include", "tier": 2, "duns": 690577879,
        "parts": "Gaskets, sealing sheets, thermal insulation for engines",
        "oems": "Toyota, Honda, Nissan"},

    "UCHIYAMA MANUFACTURING CORP":      {"status": "include", "tier": 2, "duns": 690563036,
        "parts": "Oil seals, rubber gaskets, dust covers",
        "oems": "Toyota, Honda, Nissan, Mazda, Subaru, General Motors"},

    "AMS AG":                           {"status": "include", "tier": 2, "duns": 300209194,
        "parts": "Optical sensors, ambient light sensors, lidar, automotive lighting",
        "oems": "Stellantis"},

    "MITSUBOSHI BELTING LTD":           {"status": "include", "tier": 2, "duns": 690537287,
        "parts": "Timing belts, poly-V belts, flat belts",
        "oems": "Volkswagen, Stellantis, Toyota, Renault, Hyundai"},

    "AISAN INDUSTRY CO LTD":            {"status": "include", "tier": 2, "duns": 690578364,
        "parts": "Throttle bodies, fuel injection components, EGR systems",
        "oems": "Toyota, Renault, Nissan, Volvo, Suzuki"},

    "PIOLAX INC":                       {"status": "include", "tier": 2, "duns": 690656772,
        "parts": "Plastic clips, retainers, springs, interior parts",
        "oems": "Honda, Nissan, Subaru, Mazda, Mitsubishi, Suzuki"},

    "NITTO DENKO CORP":                 {"status": "include", "tier": 2, "duns": 690538913,
        "parts": "Masking films, window protection films, EV battery films, NVH tapes",
        "oems": "Toyota, Honda, Nissan, Tesla"},

    "DAIDO CORP":                       {"status": "include", "tier": 2, "duns": 690644729,
        "parts": "Steel wire rope, suspension wires, window regulator cables",
        "oems": "Toyota, Honda, Volkswagen, Nissan, General Motors"},

    "COMMERCIAL VEHICLE GROUP INC":     {"status": "include", "tier": 2, "duns": 150146855,
        "parts": "Seats, cab-related products, wiper systems, trim for trucks/buses",
        "oems": ""},

    "HARADA INDUSTRY CO LTD":           {"status": "include", "tier": 2, "duns": 690595079,
        "parts": "Roof-mount antennas, shark-fin antennas, window antennas",
        "oems": "Toyota, Nissan, General Motors, Ford, Honda"},

    "NISSHINBO HOLDINGS INC":           {"status": "include", "tier": 2, "duns": 690691134,
        "parts": "Brake pads, brake shoes, electronic circuits, NVH products",
        "oems": "Ford, General Motors, Toyota, Volkswagen"},

    "SENIOR PLC":                       {"status": "include", "tier": 2, "duns": 210514501,
        "parts": "Flexible fluid conveyance, heat exchanger tubes, automotive fluid systems",
        "oems": "Volkswagen, BMW"},

    "HOSIDEN CORPORATION":              {"status": "include", "tier": 2, "duns": 690539184,
        "parts": "Automotive connectors, touch sensors, EV charging connectors",
        "oems": "Toyota, Honda, Nissan"},

    "SANKO GOSEI LTD":                  {"status": "include", "tier": 2, "duns": 690677380,
        "parts": "Interior plastic components, bumpers, door trims",
        "oems": "Toyota, Honda"},

    "ZHEJIANG YINLUN MACHINERY CO LTD": {"status": "include", "tier": 2, "duns": 420810582,
        "parts": "EV battery thermal management, heat exchangers, coolers",
        "oems": "Tesla, Volkswagen, General Motors, Ford"},

    "WOORY INDUSTRIAL HOLDINGS CO LTD": {"status": "include", "tier": 2, "duns": 689223774,
        "parts": "EV battery cooling, HVAC systems, heat exchangers",
        "oems": "Tesla, Kia, Hyundai"},

    "ITT INC":                          {"status": "include", "tier": 2, "duns": 80267418,
        "parts": "Brake pads, EV regenerative brake pads, connectors",
        "oems": "Volkswagen, BMW, Mercedes, Stellantis"},

    "GUANGDONG HONGTU TECHNOLOGY HOLDING": {"status": "include", "tier": 2, "duns": 530633841,
        "parts": "Aluminum die castings, EV structural parts, battery enclosures",
        "oems": "Tesla"},

    "SUPRAJIT ENGINEERING LTD":         {"status": "include", "tier": 2, "duns": 918030230,
        "parts": "Control cables, parking brake cables, shift cables",
        "oems": "BMW"},

    "DONALDSON COMPANY INC":            {"status": "include", "tier": 2, "duns": 6477301,
        "parts": "Engine air filtration, fuel filtration, crankcase ventilation",
        "oems": "Ford, Volvo"},

    "NISSHINBO HOLDINGS INC":           {"status": "include", "tier": 2, "duns": 690691134,
        "parts": "Brake pads, brake shoes, electronic circuits, NVH products",
        "oems": "Ford, General Motors, Toyota, Volkswagen"},

    "YOKOWO CO LTD":                    {"status": "include", "tier": 2, "duns": 690549225,
        "parts": "Spring contacts, antennas, automotive connectors",
        "oems": "Toyota, Honda, Nissan, Mazda"},

    "XIAMEN HONGFA ELECTROACOUSTIC CO": {"status": "include", "tier": 2, "duns": 654675222,
        "parts": "Automotive relays, high-voltage contactors for EVs",
        "oems": "Tesla, Toyota, Volkswagen"},

    "HEXAGON COMPOSITES ASA":           {"status": "include", "tier": 2, "duns": 517808812,
        "parts": "Composite cylinders for CNG/hydrogen vehicles",
        "oems": "Toyota"},

    "MODINE MANUFACTURING CO":          {"status": "include", "tier": 2, "duns": 6092555,
        "parts": "Radiators, oil coolers, charge air coolers, EV thermal modules",
        "oems": "Stellantis, Ford, Tesla"},

    "CTS CORP":                         {"status": "include", "tier": 2, "duns": 5068515,
        "parts": "Pedal sensors, transmission sensors, actuators, temperature sensors",
        "oems": "General Motors, Ford, Toyota, Honda"},

    "CUMMINS INC":                      {"status": "include", "tier": 1, "duns": 6415160,
        "parts": "Diesel/gas engines, emission solutions, power systems",
        "oems": "Stellantis"},

    "TDK CORP":                         {"status": "include", "tier": 2, "duns": 690551346,
        "parts": "Ferrite cores, capacitors, EV battery management systems, sensors",
        "oems": "Tesla, Toyota, Honda, General Motors, Volkswagen"},

    "MAYVILLE ENGINEERING CO INC":      {"status": "include", "tier": 2, "duns": 6100630,
        "parts": "Fabricated structural components, cylinder heads, chassis parts",
        "oems": "Volvo"},

    "HOWMET AEROSPACE INC":             {"status": "include", "tier": 2, "duns": 1339472,
        "parts": "Automotive fasteners, multi-material fasteners, wheels (some auto)",
        "oems": "Ford, General Motors"},

    "MINEBEA MITSUMI INC":              {"status": "include", "tier": 2, "duns": 690571757,
        "parts": "Miniature ball bearings, stepping motors, sensors, LED backlights",
        "oems": "Toyota, Honda, Nissan, Ford, Tesla, BMW"},

    "OMRON CORPORATION":                {"status": "include", "tier": 2, "duns": 690537899,
        "parts": "Automotive relays, sensors, EV on-board charger components",
        "oems": "Toyota, Honda, Nissan"},

    "FOSTER ELECTRIC CO LTD":           {"status": "include", "tier": 2, "duns": 690555933,
        "parts": "Speakers, microphones, actuators for automotive",
        "oems": "Toyota, Honda, Nissan, Suzuki, Mazda, Subaru, General Motors"},

    "MITSUBISHI MATERIALS CORP":        {"status": "include", "tier": 2, "duns": 690536867,
        "parts": "Cemented carbide cutting tools, copper alloys, aluminum for auto",
        "oems": "Toyota, Ford, Nissan, Volkswagen"},

    "ZHENGZHOU COAL MINING MACHINERY GRP": {"status": "exclude", "reason": "Coal mining equipment — automotive use (HVAC) is immaterial"},

    "CTEK AB (PUBL)":                   {"status": "include", "tier": 2, "duns": 350685597,
        "parts": "Battery chargers, EV charging solutions",
        "oems": "BMW, Volkswagen"},

    "AISAN INDUSTRY CO LTD":            {"status": "include", "tier": 2, "duns": 690578364,
        "parts": "Throttle bodies, fuel injection components, EGR systems",
        "oems": "Toyota, Renault, Nissan, Volvo, Suzuki"},

    "EATON CORPORATION PUBLIC LTD CO":  {"status": "include", "tier": 1, "duns": 985419987,
        "parts": "Transmission systems, vehicle power distribution, EV charging & control",
        "oems": "General Motors"},

    "KONGSBERG AUTOMOTIVE ASA":         {"status": "include", "tier": 2, "duns": 518896162,
        "parts": "Gear shift cables, seating comfort systems, fluid/air management",
        "oems": "Ford, Nissan"},

    "CUMMINS INC":                      {"status": "include", "tier": 1, "duns": 6415160,
        "parts": "Diesel/natural gas/hydrogen engines, emission after-treatment systems",
        "oems": "Stellantis"},

    "HOWMET AEROSPACE INC":             {"status": "include", "tier": 2, "duns": 1339472,
        "parts": "Automotive fasteners, structural fasteners, precision cast components",
        "oems": "Ford, General Motors"},

    "MITSUBOSHI BELTING LTD":           {"status": "include", "tier": 2, "duns": 690537287,
        "parts": "Timing belts, poly-V belts, flat belts",
        "oems": "Volkswagen, Stellantis, Toyota, Renault, Hyundai"},

    "SANDEN CORPORATION":               {"status": "include", "tier": 2, "duns": 690558051,
        "parts": "Automotive HVAC compressors, EV heat pump modules",
        "oems": "Toyota, Hyundai, Audi, BMW, Mercedes, Ford, General Motors"},

    "T RAD CO LTD":                     {"status": "include", "tier": 2, "duns": 690569751,
        "parts": "Radiators, oil coolers, heat exchangers, EV thermal modules",
        "oems": "Toyota, Honda, General Motors"},

    "NICHIRIN CO LTD":                  {"status": "include", "tier": 2, "duns": 690691068,
        "parts": "Brake hoses, fuel hoses, HVAC hoses",
        "oems": "Honda, Toyota, Nissan"},

    "HOLLEY INC":                       {"status": "include", "tier": 2, "duns": 117688620,
        "parts": "Performance carburetors, fuel injection systems, exhaust systems",
        "oems": "General Motors"},

    "STANLEY ELECTRIC CO LTD":          {"status": "include", "tier": 2, "duns": 690550637,
        "parts": "Headlamps, taillamps, fog lamps, LED assemblies",
        "oems": "Honda, Toyota, Subaru"},

    "VOXX INTERNATIONAL CORP":          {"status": "include", "tier": 2, "duns": 44694040,
        "parts": "Remote start systems, vehicle security, OEM electronics",
        "oems": "Stellantis, Ford, General Motors, Nissan, Subaru"},

    "TYC BROTHER INDUSTRIAL CO LTD":    {"status": "include", "tier": 2, "duns": 656041118,
        "parts": "Aftermarket headlamps, tail lamps, signaling lamps",
        "oems": "Ford, General Motors"},

    "PARK-OHIO HOLDINGS CORP":          {"status": "include", "tier": 2, "duns": 49746014,
        "parts": "Engineered fasteners, assembly components, supply chain management",
        "oems": "General Motors, Ford, Stellantis"},

    "HOWMET AEROSPACE INC":             {"status": "include", "tier": 2, "duns": 1339472,
        "parts": "Automotive fasteners, multi-material fasteners",
        "oems": "Ford, General Motors"},
}

print(f"Categorization built with {len(CATEGORIZED)} entries")
print("Done")
