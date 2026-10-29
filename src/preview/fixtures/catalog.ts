import type { Category, Collection, MatrixVariant, OptionAxis, PreviewImage, Product, StoreFacts } from "../types";

/*
 * DESIGN PREVIEW FIXTURES — invented merchant data for judging the design.
 * Never imported by production code, never sent to an API. The production
 * storefront reads all of this from the backend; the future no-brand-in-src
 * guard must exempt `src/preview/` explicitly, because a fixture is exactly
 * the data that guard keeps out of everything else.
 */

const img = (file: string, en: string, ar: string): PreviewImage => ({ src: `/preview/images/${file}.jpg`, alt: { en, ar } });
const L = (en: string, ar: string) => ({ en, ar });

export const store: StoreFacts = {
  name: L("Hirfa", "حِرفة"),
  tagline: L("Clothes and tools, made to be used for years", "ملابس وعُدد تُصنع لتُستخدم سنوات"),
  currency: "EGP",
  phone: "+20 100 555 0142",
  deliveryDays: { min: 2, max: 4 },
  returnDays: 14,
  deliveryFee: "75.00",
  paymentMethods: [
    { method: "COD", label: L("Cash on delivery", "الدفع عند الاستلام"), instructions: L("Pay the courier in cash when your order arrives.", "ادفع نقدًا لمندوب التوصيل عند وصول طلبك.") },
    { method: "WALLET", label: L("Mobile wallet", "محفظة إلكترونية"), instructions: L("Transfer the exact total to 0100 555 0142, then upload the receipt.", "حوّل المبلغ بالضبط إلى 0100 555 0142 ثم ارفع إيصال التحويل.") },
    { method: "INSTAPAY", label: L("InstaPay", "إنستاباي"), instructions: L("Send the exact total to hirfa@instapay, then upload the receipt.", "أرسل المبلغ بالضبط إلى hirfa@instapay ثم ارفع إيصال التحويل.") },
  ],
  pickupLocation: { name: L("Hirfa workshop, Zamalek", "ورشة حِرفة، الزمالك"), address: L("14 Mohamed Mazhar St, Zamalek, Cairo", "١٤ شارع محمد مظهر، الزمالك، القاهرة") },
  governorates: [L("Cairo", "القاهرة"), L("Giza", "الجيزة"), L("Alexandria", "الإسكندرية"), L("Qalyubia", "القليوبية"), L("Dakahlia", "الدقهلية"), L("Red Sea", "البحر الأحمر")],
};

export const categories: Category[] = [
  { slug: "shirts", name: L("Shirts", "قمصان"), image: img("category-apparel", "Shirts on a rail", "قمصان معلقة") },
  { slug: "hand-tools", name: L("Hand tools", "عُدد يدوية"), image: img("category-tools", "Hand tools laid out", "عُدد يدوية مرتبة") },
  { slug: "workwear", name: L("Workwear", "ملابس العمل"), image: img("category-workwear", "Workwear and boots", "ملابس عمل وأحذية") },
  { slug: "accessories", name: L("Accessories", "إكسسوارات"), image: img("tote-canvas", "A canvas tote", "حقيبة من الكانفاس") },
  { slug: "knitwear", name: L("Knitwear", "تريكو") },
  { slug: "trousers", name: L("Trousers", "بناطيل") },
  { slug: "workshop", name: L("Workshop", "مستلزمات الورشة") },
];

export const collections: Collection[] = [
  {
    slug: "washed-linen",
    name: L("Washed linen", "الكتان المغسول"),
    description: L("Shirts cut from heavy linen, washed until soft — they only get better.", "قمصان من كتان ثقيل مغسول حتى يلين، ويزداد جمالًا مع الوقت."),
    image: img("story-wardrobe", "Linen garments, folded", "ملابس من الكتان مطوية"),
  },
  {
    slug: "the-workbench",
    name: L("The workbench", "طاولة العمل"),
    description: L("Forged edges and honest steel. Tools you hand down.", "حواف مطروقة وصلب صادق. عُدد تُورَّث."),
    image: img("story-craft", "Hands working wood at a bench", "يدان تعملان على الخشب"),
  },
  {
    slug: "autumn-work",
    name: L("Autumn work clothes", "ملابس العمل للخريف"),
    description: L("Canvas, wool and leather for cool mornings in the workshop.", "كانفاس وصوف وجلد لصباحات الورشة الباردة."),
    image: img("editorial-band", "Workshop light", "ضوء الورشة"),
  },
];

/* ----------------------------------------------------------------- variant helpers */

type Combination = Record<string, string>;

/**
 * Builds a sparse matrix: every combination of the axes, minus those `notMade`
 * (no variant exists), with those in `soldOut` present but not purchasable.
 */
function matrix(
  skuPrefix: string,
  axes: OptionAxis[],
  price: (combo: Combination) => string,
  options: { notMade?: (combo: Combination) => boolean; soldOut?: (combo: Combination) => boolean; lowStock?: (combo: Combination) => boolean; compareAt?: (combo: Combination) => string | undefined } = {}
): MatrixVariant[] {
  const combos = axes.reduce<Combination[]>((acc, axis) => acc.flatMap((combo) => axis.values.map((v) => ({ ...combo, [axis.key]: v.value }))), [{}]);
  return combos
    .filter((combo) => !options.notMade?.(combo))
    .map((combo, index) => ({
      variantId: `${skuPrefix}-${index}`,
      sku: [skuPrefix, ...axes.map((axis) => combo[axis.key]!.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))].join("-"),
      optionValues: axes.map((axis) => ({ key: axis.key, value: combo[axis.key]! })),
      price: price(combo),
      ...(options.compareAt?.(combo) ? { compareAtPrice: options.compareAt(combo) } : {}),
      purchasable: !options.soldOut?.(combo),
      ...(options.lowStock?.(combo) ? { lowStock: true } : {}),
    }));
}

const sizeAxis = (values: string[]): OptionAxis => ({ key: "size", name: L("Size", "المقاس"), values: values.map((v) => ({ value: v, label: L(v, v) })) });

const shirtColours: OptionAxis = {
  key: "colour",
  name: L("Colour", "اللون"),
  values: [
    { value: "olive", label: L("Olive", "زيتوني"), swatch: "#5f6b4a", image: "/preview/images/shirt-linen-olive.jpg" },
    { value: "sand", label: L("Sand", "رملي"), swatch: "#d8c7a6" },
    { value: "ink", label: L("Ink", "كحلي داكن"), swatch: "#22262e" },
  ],
};

const spec = (en: string, ar: string, valueEn: string, valueAr: string) => ({ label: L(en, ar), value: L(valueEn, valueAr) });

/* ----------------------------------------------------------------- products */

/** The preview's "today" — fixed, so "New" never differs between the server render and the browser. */
export const PREVIEW_TODAY = "2026-10-12";

export const products: Product[] = [
  {
    slug: "washed-linen-shirt",
    name: L("Washed linen camp shirt", "قميص كتان مغسول بياقة مفتوحة"),
    description: L(
      "Cut from 190 g/m² European linen and garment-washed for a soft, lived-in hand from the first wear. A camp collar, a single chest pocket and corozo buttons. Relaxed through the body; size down for a closer fit.",
      "مفصّل من كتان أوروبي بوزن ١٩٠ جم/م² ومغسول بعد الخياطة ليكون ناعمًا من أول ارتداء. ياقة مفتوحة وجيب واحد على الصدر وأزرار من الكوروزو. قصّة مريحة؛ اختر مقاسًا أصغر لقَصّة أقرب."
    ),
    categorySlug: "shirts",
    collectionSlugs: ["washed-linen"],
    images: [
      img("shirt-linen-olive", "Washed linen camp shirt in olive", "قميص الكتان المغسول باللون الزيتوني"),
      img("shirt-linen-olive-2", "The olive camp shirt, worn open", "القميص الزيتوني مفتوحًا"),
    ],
    optionAxes: [shirtColours, sizeAxis(["S", "M", "L", "XL", "XXL"])],
    variants: matrix("LSH", [shirtColours, sizeAxis(["S", "M", "L", "XL", "XXL"])], () => "1450.00", {
      notMade: (c) => c.colour === "ink" && c.size === "XXL",
      soldOut: (c) => c.colour === "sand" && c.size === "M",
      lowStock: (c) => c.colour === "olive" && c.size === "L",
    }),
    specs: [
      spec("Fabric", "الخامة", "100% linen, 190 g/m²", "١٠٠٪ كتان، ١٩٠ جم/م²"),
      spec("Fit", "القصّة", "Relaxed", "مريحة"),
      spec("Length (M)", "الطول (M)", "76 cm", "٧٦ سم"),
      spec("Care", "العناية", "Machine wash 40°C, line dry", "غسيل آلي ٤٠° وتجفيف طبيعي"),
    ],
    rating: { average: 4.7, count: 38 },
    addedAt: "2026-09-28",
  },
  {
    slug: "camp-collar-linen-shirt",
    name: L("Long-sleeve linen work shirt", "قميص عمل من الكتان بأكمام طويلة"),
    description: L("A long-sleeved work shirt in the same washed linen, with a box-pleated back for reaching.", "قميص عمل بأكمام طويلة من نفس الكتان المغسول، بطية في الظهر لحرية الحركة."),
    categorySlug: "shirts",
    collectionSlugs: ["washed-linen"],
    images: [img("shirt-linen-sand", "Long-sleeve linen work shirt on a hanger", "قميص عمل من الكتان على شمّاعة")],
    optionAxes: [sizeAxis(["S", "M", "L", "XL"])],
    variants: matrix("CCS", [sizeAxis(["S", "M", "L", "XL"])], () => "1250.00", { compareAt: () => "1490.00" }),
    specs: [spec("Fabric", "الخامة", "100% linen", "١٠٠٪ كتان"), spec("Fit", "القصّة", "Regular", "عادية")],
    addedAt: "2026-10-04",
  },
  {
    slug: "canvas-chore-jacket",
    name: L("Brushed wool work jacket", "جاكيت عمل من الصوف المُمشَّط"),
    description: L("Dense brushed wool with a lined body and deep patch pockets — warm enough for cold workshop mornings.", "صوف كثيف مُمشَّط ببطانة داخلية وجيوب عميقة، دافئ بما يكفي لصباحات الورشة الباردة."),
    categorySlug: "workwear",
    collectionSlugs: ["autumn-work"],
    images: [img("overshirt-chore", "Brushed wool work jacket", "جاكيت عمل من الصوف")],
    optionAxes: [sizeAxis(["S", "M", "L", "XL"])],
    variants: matrix("CJK", [sizeAxis(["S", "M", "L", "XL"])], () => "2850.00", { compareAt: () => "3400.00", soldOut: (c) => c.size === "S" }),
    specs: [spec("Fabric", "الخامة", "80% wool, 20% nylon", "٨٠٪ صوف، ٢٠٪ نايلون"), spec("Pockets", "الجيوب", "4", "٤")],
    rating: { average: 4.9, count: 21 },
    addedAt: "2026-09-12",
  },
  {
    slug: "merino-crew-knit",
    name: L("Merino crew knit", "كنزة صوف ميرينو"),
    description: L("A fine-gauge merino crew that layers under a jacket without bulk.", "كنزة من صوف الميرينو الناعم تُلبس تحت الجاكيت دون ثقل."),
    categorySlug: "knitwear",
    collectionSlugs: ["autumn-work"],
    images: [img("knit-sweater", "Merino crew knit", "كنزة صوف ميرينو")],
    optionAxes: [sizeAxis(["S", "M", "L", "XL"])],
    variants: matrix("MCK", [sizeAxis(["S", "M", "L", "XL"])], () => "1950.00"),
    specs: [spec("Fabric", "الخامة", "100% merino wool", "١٠٠٪ صوف ميرينو")],
    addedAt: "2026-10-08",
  },
  {
    slug: "work-trousers",
    name: L("Twill work trousers", "بنطلون عمل من التويل"),
    description: L("Mid-weight cotton twill with a gusseted crotch and a reinforced hem.", "تويل قطني متوسط الوزن بتقوية في الحِجر والأطراف."),
    categorySlug: "trousers",
    collectionSlugs: ["autumn-work"],
    images: [img("trousers-chino", "Twill work trousers", "بنطلون عمل")],
    optionAxes: [
      { key: "waist", name: L("Waist", "الخصر"), values: ["30", "32", "34", "36"].map((v) => ({ value: v, label: L(v, v) })) },
      { key: "length", name: L("Length", "الطول"), values: ["30", "32", "34"].map((v) => ({ value: v, label: L(v, v) })) },
    ],
    variants: matrix(
      "TWT",
      [
        { key: "waist", name: L("Waist", "الخصر"), values: ["30", "32", "34", "36"].map((v) => ({ value: v, label: L(v, v) })) },
        { key: "length", name: L("Length", "الطول"), values: ["30", "32", "34"].map((v) => ({ value: v, label: L(v, v) })) },
      ],
      () => "1650.00",
      { notMade: (c) => c.waist === "30" && c.length === "34", soldOut: (c) => c.waist === "32" && c.length === "32" }
    ),
    specs: [spec("Fabric", "الخامة", "10 oz cotton twill", "تويل قطني ١٠ أونصة"), spec("Rise", "ارتفاع الخصر", "Mid", "متوسط")],
    addedAt: "2026-08-30",
  },
  {
    slug: "leather-work-apron",
    name: L("Leather work apron", "مريلة عمل من الجلد"),
    description: L("Vegetable-tanned leather bib apron with cross-back straps that take the weight off your neck.", "مريلة من الجلد المدبوغ نباتيًا بأحزمة متقاطعة على الظهر تريح الرقبة."),
    categorySlug: "workwear",
    collectionSlugs: ["the-workbench", "autumn-work"],
    images: [img("apron-leather", "Leather work apron", "مريلة عمل من الجلد"), img("category-workwear", "The apron worn at the bench", "المريلة أثناء العمل على الطاولة")],
    optionAxes: [],
    variants: [{ variantId: "APR-0", sku: "APR-ONE", optionValues: [], price: "1650.00", purchasable: true, lowStock: true }],
    specs: [spec("Leather", "الجلد", "2 mm vegetable-tanned", "مدبوغ نباتيًا ٢ مم"), spec("Length", "الطول", "86 cm", "٨٦ سم")],
    addedAt: "2026-09-20",
  },
  {
    slug: "canvas-tote",
    name: L("Coated canvas tote", "حقيبة من الكانفاس المغطّى"),
    description: L("A deep, structured tote in coated canvas that stands on its own.", "حقيبة عميقة متماسكة من كانفاس مغطّى تقف بمفردها."),
    categorySlug: "accessories",
    collectionSlugs: [],
    images: [img("tote-canvas", "Heavy canvas tote", "حقيبة كانفاس")],
    optionAxes: [],
    variants: [{ variantId: "TOT-0", sku: "TOT-ONE", optionValues: [], price: "690.00", purchasable: true }],
    specs: [spec("Capacity", "السعة", "22 L", "٢٢ لترًا")],
    addedAt: "2026-07-14",
  },
  {
    slug: "leather-work-boots",
    name: L("Leather work boots", "حذاء عمل من الجلد"),
    description: L("Goodyear-welted full-grain leather boots on a resoleable sole.", "حذاء من الجلد الطبيعي بخياطة جوديير ونعل قابل للتغيير."),
    categorySlug: "workwear",
    collectionSlugs: ["autumn-work"],
    images: [img("boots-leather", "Leather work boots", "حذاء عمل من الجلد")],
    optionAxes: [sizeAxis(["40", "41", "42", "43", "44", "45"])],
    variants: matrix("BTS", [sizeAxis(["40", "41", "42", "43", "44", "45"])], () => "3900.00", { soldOut: (c) => c.size === "45", lowStock: (c) => c.size === "44" }),
    specs: [spec("Construction", "طريقة الصنع", "Goodyear welt", "خياطة جوديير"), spec("Upper", "الوجه", "Full-grain leather", "جلد طبيعي كامل")],
    rating: { average: 4.6, count: 54 },
    addedAt: "2026-09-02",
  },
  {
    slug: "bench-chisel-set",
    name: L("Bench chisel set", "طقم أزاميل نجارة"),
    description: L(
      "Drop-forged chrome-vanadium blades hardened to 60 HRC, ground flat on the back and honed ready to use, in two-part grips with a strike cap for mallet work.",
      "شفرات من صلب الكروم فاناديوم مطروقة ومقساة إلى ٦٠ HRC، مسطّحة الظهر ومشحوذة وجاهزة للاستخدام، بمقابض من جزأين وغطاء للطَّرق بالمطرقة الخشبية."
    ),
    categorySlug: "hand-tools",
    collectionSlugs: ["the-workbench"],
    images: [img("chisel-set", "Three bench chisels on oak", "ثلاثة أزاميل نجارة على خشب البلوط"), img("chisel-set-2", "A chisel at work", "إزميل أثناء العمل")],
    optionAxes: [{ key: "set", name: L("Set", "الطقم"), values: [{ value: "3", label: L("3 chisels", "٣ أزاميل") }, { value: "5", label: L("5 chisels", "٥ أزاميل") }] }],
    variants: matrix("CHS", [{ key: "set", name: L("Set", "الطقم"), values: [{ value: "3", label: L("3", "٣") }, { value: "5", label: L("5", "٥") }] }], (c) => (c.set === "3" ? "1850.00" : "2950.00")),
    specs: [
      spec("Blade widths (set of 3)", "عرض الشفرات (طقم ٣)", "6 · 12 · 20 mm", "٦ · ١٢ · ٢٠ مم"),
      spec("Steel", "الصلب", "Chrome-vanadium, 60 HRC", "كروم فاناديوم، ٦٠ HRC"),
      spec("Bevel", "زاوية الشطف", "25°", "٢٥°"),
      spec("Handle", "المقبض", "Two-part grip, strike cap", "مقبض من جزأين بغطاء للطَّرق"),
    ],
    rating: { average: 4.8, count: 112 },
    addedAt: "2026-10-01",
  },
  {
    slug: "low-angle-block-plane",
    name: L("Low-angle block plane", "فارة كتلة بزاوية منخفضة"),
    description: L("Ductile iron body, 12° bed and an adjustable mouth for end grain.", "جسم من الحديد المرن بزاوية ١٢° وفتحة قابلة للضبط لأطراف الألياف."),
    categorySlug: "hand-tools",
    collectionSlugs: ["the-workbench"],
    images: [img("hand-plane", "Low-angle block plane", "فارة كتلة")],
    optionAxes: [],
    variants: [{ variantId: "BPL-0", sku: "BPL-12", optionValues: [], price: "1850.00", purchasable: true }],
    specs: [spec("Bed angle", "زاوية القاعدة", "12°", "١٢°"), spec("Blade width", "عرض الشفرة", "35 mm", "٣٥ مم"), spec("Length", "الطول", "160 mm", "١٦٠ مم")],
    addedAt: "2026-09-25",
  },
  {
    slug: "claw-hammer",
    name: L("Hickory claw hammer", "مطرقة بمخلب ومقبض من الهيكوري"),
    description: L("A forged head on a hickory handle, balanced for long days of framing.", "رأس مطروق على مقبض من خشب الهيكوري، متوازن لأيام العمل الطويلة."),
    categorySlug: "hand-tools",
    collectionSlugs: ["the-workbench"],
    images: [img("hammer-claw", "Hickory claw hammer", "مطرقة بمخلب")],
    optionAxes: [{ key: "weight", name: L("Head weight", "وزن الرأس"), values: [{ value: "450", label: L("450 g", "٤٥٠ جم") }, { value: "570", label: L("570 g", "٥٧٠ جم") }] }],
    variants: matrix("HMR", [{ key: "weight", name: L("Head weight", "وزن الرأس"), values: [{ value: "450", label: L("450 g", "٤٥٠ جم") }, { value: "570", label: L("570 g", "٥٧٠ جم") }] }], (c) => (c.weight === "450" ? "640.00" : "720.00")),
    specs: [spec("Handle", "المقبض", "Hickory, 330 mm", "هيكوري، ٣٣٠ مم")],
    addedAt: "2026-08-18",
  },
  {
    slug: "rip-saw",
    name: L("Western rip saw", "منشار شقّ غربي"),
    description: L("Taper-ground plate filed rip at 7 points per inch.", "نصل مستدق مسنون للشقّ بمعدل ٧ أسنان في البوصة."),
    categorySlug: "hand-tools",
    collectionSlugs: ["the-workbench"],
    images: [img("hand-saw", "Western rip saw", "منشار شقّ")],
    optionAxes: [],
    variants: [{ variantId: "SAW-0", sku: "SAW-7PPI", optionValues: [], price: "980.00", purchasable: true }],
    specs: [spec("Plate", "النصل", "560 mm, 7 PPI", "٥٦٠ مم، ٧ أسنان/بوصة")],
    addedAt: "2026-07-30",
  },
  {
    slug: "adjustable-wrench",
    name: L("Forged adjustable wrench", "مفتاح ربط قابل للضبط مطروق"),
    description: L("Drop-forged chrome-vanadium with a fine worm screw that holds its setting.", "صلب كروم فاناديوم مطروق ببرغي دقيق يحفظ ضبطه."),
    categorySlug: "workshop",
    collectionSlugs: [],
    images: [img("wrench-set", "Forged adjustable wrench", "مفتاح ربط قابل للضبط")],
    optionAxes: [{ key: "length", name: L("Length", "الطول"), values: [{ value: "200", label: L("200 mm", "٢٠٠ مم") }, { value: "300", label: L("300 mm", "٣٠٠ مم") }] }],
    variants: matrix("WRN", [{ key: "length", name: L("Length", "الطول"), values: [{ value: "200", label: L("200", "٢٠٠") }, { value: "300", label: L("300", "٣٠٠") }] }], (c) => (c.length === "200" ? "450.00" : "620.00"), { soldOut: (c) => c.length === "300" }),
    specs: [spec("Jaw capacity (200 mm)", "فتحة الفك (٢٠٠ مم)", "27 mm", "٢٧ مم")],
    addedAt: "2026-06-11",
  },
  {
    slug: "leather-tool-pouch",
    name: L("Leather tool pouch", "حقيبة عُدد جلدية للحزام"),
    description: L("A belt pouch in vegetable-tanned leather with six pockets and a hammer loop.", "حقيبة حزام من الجلد المدبوغ نباتيًا بستة جيوب وحلقة للمطرقة."),
    categorySlug: "workshop",
    collectionSlugs: ["the-workbench"],
    images: [img("tool-roll", "Leather tool pouch worn on a belt", "حقيبة عُدد جلدية على الحزام")],
    optionAxes: [],
    variants: [{ variantId: "PCH-0", sku: "PCH-6", optionValues: [], price: "1190.00", purchasable: true }],
    specs: [spec("Pockets", "الجيوب", "6 + hammer loop", "٦ + حلقة للمطرقة")],
    addedAt: "2026-09-08",
  },
  {
    slug: "tape-measure",
    name: L("Five-metre tape measure", "شريط قياس بطول ٥ أمتار"),
    description: L("A 25 mm blade with millimetre graduations and a true-zero hook.", "شريط بعرض ٢٥ مم بتدريج بالمليمتر وخطاف بصفر دقيق."),
    categorySlug: "workshop",
    collectionSlugs: ["the-workbench"],
    images: [img("folding-rule", "Tape measure on an oak board", "شريط قياس على لوح من البلوط")],
    optionAxes: [],
    variants: [{ variantId: "TAP-0", sku: "TAP-5M", optionValues: [], price: "260.00", purchasable: true }],
    specs: [spec("Length", "الطول", "5 m", "٥ م"), spec("Blade", "الشريط", "25 mm", "٢٥ مم")],
    addedAt: "2026-10-06",
  },
  {
    slug: "forest-hatchet",
    name: L("Forest hatchet", "بلطة صغيرة للغابات"),
    description: L("A hand-forged head on a 35 cm hickory haft, with a leather edge guard.", "رأس مطروق يدويًا على يد من الهيكوري بطول ٣٥ سم مع غطاء جلدي للحد."),
    categorySlug: "hand-tools",
    collectionSlugs: [],
    images: [img("axe", "Forest hatchet", "بلطة صغيرة")],
    optionAxes: [],
    variants: [{ variantId: "HTC-0", sku: "HTC-35", optionValues: [], price: "1390.00", purchasable: false }],
    specs: [spec("Head", "الرأس", "600 g, hand-forged", "٦٠٠ جم، مطروق يدويًا")],
    addedAt: "2026-05-20",
  },
];

export function findProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function findCategory(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}
