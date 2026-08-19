import { useState, useEffect, useRef } from "react";

const FONT = "Arial, 'Helvetica Neue', sans-serif";
const ADMIN_PIN = "2024";

/* ── SUPABASE ─────────────────────────────── */
// Vercel дээр Settings → Environment Variables-д нэмнэ үү:
//   VITE_SUPABASE_URL  =  https://xxxx.supabase.co
//   VITE_SUPABASE_KEY  =  eyJhbGci...
let SUPABASE_URL = "", SUPABASE_KEY = "";
try { SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || ""; } catch(_) {}
try { SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_KEY || ""; } catch(_) {}

const HAS_SB = !!(SUPABASE_URL && SUPABASE_KEY);
const HAS_WS = (() => { try { return typeof window !== "undefined" && typeof window.storage?.get === "function"; } catch(_) { return false; } })();
const sbH = () => ({ "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" });
const dbSave  = async (e) => { if (HAS_SB) { await fetch(`${SUPABASE_URL}/rest/v1/submissions`, { method:"POST", headers:{...sbH(),"Prefer":"return=minimal"}, body:JSON.stringify(e) }); } else if (HAS_WS) { let c=null; try{c=await window.storage.get("compassdata",true);}catch(_){} const l=c?JSON.parse(c.value):[]; l.push(e); await window.storage.set("compassdata",JSON.stringify(l),true); } };
const dbLoad  = async () => { if (HAS_SB) { const r=await fetch(`${SUPABASE_URL}/rest/v1/submissions?select=*&order=id.asc`,{headers:sbH()}); return r.ok?await r.json():[]; } if (HAS_WS) { try{const d=await window.storage.get("compassdata",true); return d?JSON.parse(d.value):[];}catch(_){return [];} } return []; };
const dbClear = async () => { if (HAS_SB) { await fetch(`${SUPABASE_URL}/rest/v1/submissions?id=gte.0`,{method:"DELETE",headers:sbH()}); } else if (HAS_WS) { try{await window.storage.set("compassdata","[]",true);}catch(_){} } };

/* ── EXACT SCORING ARRAYS (from politicalcompass.github.io/js/script.js) ── */
/* Answer index: 0=SD, 1=D, 2=A, 3=SA */
const ECONV = [
  [7,5,0,-2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],
  [7,5,0,-2],[-7,-5,0,2],[6,4,0,-2],[7,5,0,-2],[-8,-6,0,2],[8,6,0,-2],
  [8,6,0,-1],[7,5,0,-3],[8,6,0,-1],[-7,-5,0,2],[-7,-5,0,1],[-6,-4,0,2],
  [6,4,0,-1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[-8,-6,0,1],
  [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],
  [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[-10,-8,0,1],[-5,-4,0,1],
  [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],
  [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],
  [-9,-8,0,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],
  [0,0,0,0],[0,0,0,0]
];
const SOCV = [
  [0,0,0,0],[-8,-6,0,2],[7,5,0,-2],[-7,-5,0,2],[-7,-5,0,2],[-6,-4,0,2],[7,5,0,-2],
  [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],
  [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],
  [-6,-4,0,2],[7,6,0,-2],[-5,-4,0,2],[0,0,0,0],[8,4,0,-2],[-7,-5,0,2],
  [-7,-5,0,3],[6,4,0,-3],[6,3,0,-2],[-7,-5,0,3],[-9,-7,0,2],[-8,-6,0,2],
  [7,6,0,-2],[-7,-5,0,2],[-6,-4,0,2],[-7,-4,0,2],[0,0,0,0],[0,0,0,0],
  [7,5,0,-3],[-9,-6,0,2],[-8,-6,0,2],[-8,-6,0,2],[-6,-4,0,2],[-8,-6,0,2],
  [-7,-5,0,2],[-8,-6,0,2],[-5,-3,0,2],[-7,-5,0,2],[7,5,0,-2],[-6,-4,0,2],
  [-7,-5,0,2],[-6,-4,0,2],[0,0,0,0],[-7,-5,0,2],[-6,-4,0,2],
  [-7,-6,0,2],[7,6,0,-2],[7,5,0,-2],[8,6,0,-2],[-8,-6,0,2],[-6,-4,0,2]
];
/* Formula: valE = sumE/8.0 + 0.38,  valS = sumS/19.5 + 2.41 */
/* Social convention: positive = AUTHORITARIAN, negative = LIBERTARIAN */

/* ── 62 QUESTIONS (exact original order) ── */
const QUESTIONS = [
  { i:0,  mn:"Эдийн засгийн даяаршил зайлшгүй явагдах болсон бол энэ үйл явц нь үндэстэн дамнасан корпорациудын ашиг сонирхлоос илүүтэй хүн төрөлхтний нийтлэг эрх ашигт үйлчлэх ёстой." },
  { i:1,  mn:"Манай улс зөв байсан ч, буруу байсан ч би үргэлж улс орноо дэмжинэ." },
  { i:2,  mn:"Хүн бүр хаана төрөхөө өөрөө сонгодоггүй учраас төрсөн улс орноороо бахархах нь утгагүй." },
  { i:3,  mn:"Манай үндэстэн бусад үндэстнүүдтэй харьцуулахад олон талаараа илүү давуу шинж чанартай." },
  { i:4,  mn:"Миний дайсны дайсан бол миний нөхөр." },
  { i:5,  mn:"Олон улсын эрх зөрчсөн цэргийн ажиллагааг зарим нөхцөлд зөвтгөж болно." },
  { i:6,  mn:"Мэдээлэл болон зугаа цэнгэл улам бүр хоорондоо холилдож байгаа нь сэтгэл түгшээхүйц үзэгдэл юм." },
  { i:7,  mn:"Хүмүүсийг эцсийн дүндээ үндэс угсаа, иргэншлээс нь илүү нийгмийн анги, давхаргаараа ялгардаг." },
  { i:8,  mn:"Ажилгүйдлийг бууруулахаас илүү инфляцыг хянах нь чухал." },
  { i:9,  mn:"Компаниуд байгаль орчныг сайн дураараа хамгаална гэдэгт найдах боломжгүй тул төрөөс тэдний үйл ажиллагааг зохицуулах шаардлагатай." },
  { i:10, mn:"\"Хүн бүр чадварынхаа хэрээр хувь нэмрээ оруулж, хэрэгцээнийхээ хэрээр хүртэх\" зарчим нь үндсэндээ зөв санаа." },
  { i:11, mn:"Зах зээл хэдий чинээ чөлөөтэй байна, хүмүүс төдий чинээ эрх чөлөөтэй байна." },
  { i:12, mn:"Ундны ус шиг амьдралын үндсэн хэрэгцээг хүртэл савлан, брэнд бүтээгдэхүүн болгосон нь манай нийгмийн харамсалтай дүр зураг юм." },
  { i:13, mn:"Газрыг худалдаж авч, зарж болох энгийн бараа, бүтээгдэхүүн гэж үзэх ёсгүй." },
  { i:14, mn:"Мөнгө санхүүг зүгээр л дамлан ашиглаж, нийгэмд бодит хувь нэмэр оруулдаггүй хүмүүс асар их хөрөнгөжиж байгаа нь харамсалтай." },
  { i:15, mn:"Олон улсын худалдаанд дотоодын үйлдвэрлэлээ хамгаалах бодлого зарим тохиолдолд зайлшгүй шаардлагатай." },
  { i:16, mn:"Компанийн цорын ганц нийгмийн хариуцлага нь хувьцаа эзэмшигчдэдээ ашиг оруулах явдал байх ёстой." },
  { i:17, mn:"Баян чинээлэг хүмүүсээс хэт өндөр татвар авч байна." },
  { i:18, mn:"Эрүүл мэндийн үйлчилгээний өндөр түвшний зардлыг төлөх чадвартай хүмүүс илүү өндөр чанартай эмнэлгийн тусламж авах боломжтой байх ёстой." },
  { i:19, mn:"Олон нийтэд худал, төөрөгдүүлсэн мэдээлэл өгдөг бизнесүүдэд төрөөс хариуцлага тооцох ёстой." },
  { i:20, mn:"Жинхэнэ чөлөөт зах зээл бий болгохын тулд давамгай байр сууриа ашиглан монополь үүсгэхийг оролддог үндэстэн дамнасан том корпорациудын үйл ажиллагааг хязгаарлах шаардлагатай." },
  { i:21, mn:"Эмэгтэйн амь насанд аюул учраагүй тохиолдолд үр хөндөлтийг үргэлж хууль бус байлгах ёстой." },
  { i:22, mn:"Бүх төрлийн эрх мэдэл, эрх бүхий байгууллагын шийдвэрийг эргэлзэж, шүүмжилж байх ёстой." },
  { i:23, mn:"\"Нүдийг нүдээр, шүдийг шүдээр\"." },
  { i:24, mn:"Зах зээлийн зарчмаар өөрийгөө санхүүжүүлж чаддаггүй театр, музейг татвар төлөгчдийн мөнгөөр санхүүжүүлэх ёсгүй." },
  { i:25, mn:"Сурагч, оюутнуудыг хичээлдээ заавал биечлэн суухыг шаардах ёсгүй." },
  { i:26, mn:"Хүн бүр өөрийн эрхтэй боловч өөр өөр гарал, соёл, онцлогтой хүмүүс тус тусдаа өөрсдийн бүлэг дотроо байх нь нийгэмд илүү ашигтай." },
  { i:27, mn:"Сайн эцэг эхчүүд ч заримдаа хүүхдээ шийтгэхийн тулд алгадаж, цохих шаардлагатай байдаг." },
  { i:28, mn:"Хүүхэд эцэг эхээсээ зарим зүйлийг нууцлах нь хэвийн бөгөөд байгалийн зүйл." },
  { i:29, mn:"Марихуаныг зөвхөн хувийн хэрэгцээндээ эзэмшихийг эрүүгийн гэмт хэрэг гэж үзэх ёсгүй." },
  { i:30, mn:"Сургуулийн боловсролын хамгийн гол зорилго нь ирээдүй хойч үеийг ажил хөдөлмөр эрхлэхэд бэлтгэх явдал байх ёстой." },
  { i:31, mn:"Удамшлын ноцтой хөгжлийн бэрхшээлтэй хүмүүсийг хүүхэдтэй болохыг зөвшөөрөх ёсгүй." },
  { i:32, mn:"Хүүхдүүдийн сурах хамгийн чухал зүйл бол сахилга бат, дүрэм журмыг дагаж мөрдөх явдал." },
  { i:33, mn:"\"Зэрлэг\" болон \"соёл иргэншсэн\" ард түмэн гэж байхгүй, зөвхөн өөр өөр соёл иргэншил, соёлтой ард түмнүүд байдаг." },
  { i:34, mn:"Ажиллах чадвартай атлаа ажил хийх боломжийг санаатайгаар татгалздаг хүмүүс нийгмээс дэмжлэг, тусламж шаардах ёсгүй." },
  { i:35, mn:"Асуудал тулгарсан үед түүнийг бодохын оронд анхаарлаа өөр зүйлд хандуулж, эерэг зүйлээр өөрийгөө завгүй байлгах нь дээр." },
  { i:36, mn:"Анх удаа өөр улс оронд цагаачлан ирсэн хүмүүс шинэ улсдаа хэзээ ч бүрэн дасан зохицож, нийгэмдээ бүрэн нэгдэж чаддаггүй." },
  { i:37, mn:"Хамгийн амжилттай, том корпорациудад ашигтай зүйл нь эцсийн дүндээ бид бүгдэд ашигтай байдаг." },
  { i:38, mn:"Агуулга нь хараат бус байсан ч ямар ч радио, телевиз, хэвлэл мэдээллийн байгууллагыг улсын төсвөөс санхүүжүүлэх ёсгүй." },
  { i:39, mn:"Терроризмтой тэмцэх нэрийн дор иргэний эрх, эрх чөлөөг хэт ихээр хязгаарлаж байна." },
  { i:40, mn:"Нэг намын тогтолцооны томоохон давуу тал нь ардчилсан тогтолцоонд гардаг маргаан, санал зөрөлдөөнөөс үүдэн шийдвэр гаргалт удаашрахаас сэргийлдэгт оршино." },
  { i:41, mn:"Төрийн цахим хяналт, тандалт улам хялбар болж байгаа ба зөвхөн хууль зөрчигчид л үүнээс санаа зовж байна." },
  { i:42, mn:"Хамгийн ноцтой гэмт хэрэг үйлдсэн хүмүүст цаазаар авах ял оноох боломж байх ёстой." },
  { i:43, mn:"Соёл иргэншсэн нийгэмд захирах, захирагдах шаталсан бүтэц зайлшгүй байх ёстой." },
  { i:44, mn:"Юуг ч бодитоор дүрслээгүй хийсвэр урлагийг жинхэнэ урлаг гэж үзэх ёсгүй." },
  { i:45, mn:"Эрүүгийн хэрэгтэнтэй харьцахдаа түүнийг нийгэмшүүлэхээс илүү шийтгэх нь чухал." },
  { i:46, mn:"Зарим гэмт хэрэгтнийг нийгэмшүүлэх гэж оролдох нь цаг хугацааны гарз юм." },
  { i:47, mn:"Бизнес эрхлэгч, үйлдвэрлэгчид зохиолч, уран бүтээлчдээс нийгэмд илүү чухал хүмүүс." },
  { i:48, mn:"Ээжүүд ажил мэргэжилтэй байж болох ч тэдний хамгийн эхний үүрэг бол гэр бүл, гэр орныг авч явах явдал." },
  { i:49, mn:"Бараг бүх улс төрч эдийн засгийн өсөлтийг амладаг. Гэвч эдийн засгийн өсөлт нь дэлхийн дулаарлыг бууруулахад саад болж байгааг бид анхаарах ёстой." },
  { i:50, mn:"Төр, эрх баригч байгууллагатай эвлэрч, тэдэнтэй зохицож ажиллаж сурах нь насанд хүрч, төлөвшсөний чухал шинж юм." },
  { i:51, mn:"Зурхай нь олон зүйлийг үнэн зөв тайлбарлаж чаддаг." },
  { i:52, mn:"Шашин шүтлэггүй хүн ёс суртахуунтай байж чадахгүй." },
  { i:53, mn:"Үнэхээр тусламж шаардлагатай хүмүүст төрөөс нийгмийн халамж үзүүлэхээс илүү сайн дурын буяны тусламж үзүүлэх нь зөв." },
  { i:54, mn:"Зарим хүмүүс төрөлхийн азгүй байдаг." },
  { i:55, mn:"Хүүхдийн сургууль түүнд шашны үнэт зүйлсийг төлөвшүүлэх нь чухал." },
  { i:56, mn:"Гэрлэлтээс гадуурх бэлгийн харилцаа нь ихэнх тохиолдолд ёс суртахуунгүй үйлдэл юм." },
  { i:57, mn:"Тогтвортой, хайр халамжтай харилцаатай ижил хүйстэн хосуудыг хүүхэд үрчлэн авах боломжтой байх ёстой." },
  { i:58, mn:"Харилцан зөвшөөрсөн насанд хүрсэн хүмүүсийн оролцоотой порнографыг насанд хүрсэн хүмүүст зориулан хуулиар зөвшөөрөх ёстой." },
  { i:59, mn:"Харилцан зөвшөөрсөн насанд хүрсэн хүмүүсийн хувийн унтлагын өрөөнд юу болж байгаа нь төрийн оролцох асуудал биш." },
  { i:60, mn:"Хэн ч төрөлхийн ижил хүйстэн байх боломжгүй." },
  { i:61, mn:"Өнөө үед секс хэт нээлттэй байгаа нь хэтэрч байна." },
];

/* Display axis for badge */
const qAxis = (i) => {
  const eMax = Math.max(...ECONV[i].map(Math.abs));
  const sMax = Math.max(...SOCV[i].map(Math.abs));
  if (eMax === 0 && sMax === 0) return null;
  return eMax >= sMax ? "economic" : "social";
};

const CHOICES = [
  { key:"sa", label:"Бүрэн зөвшөөрнө", ai:3, c:"#10b981" },
  { key:"a",  label:"Зөвшөөрнө",        ai:2, c:"#6366f1" },
  { key:"d",  label:"Зөвшөөрөхгүй",     ai:1, c:"#f97316" },
  { key:"sd", label:"Огт зөвшөөрөхгүй", ai:0, c:"#ef4444" },
];

const QUADS = {
  ll: {
    mn:"Либертариан Зүүнтэн", en:"Libertarian Left", c:"#10b981",
    tags:["Либертариан социализм","Анархизм","Ногоон улс төр","Мутуализм"],
    desc:"Та хувийн эрх чөлөө болон нийгмийн тэгш байдлыг хоёуланг нь эрхэмлэнэ. Капитализм ч, авторитар засаглал ч хоёулаа буруу гэж үздэг. Төрийн хяналтаас татгалзан, нийгмийн шударга ёсыг иргэдийн хамтын хүчинд тулгуурлан шийдэх ёстой гэж итгэдэг. Ноам Чомский, Мурри Буккин нарын үзэл санаатай ойр."
  },
  lr: {
    mn:"Либертариан Баруунтан", en:"Libertarian Right", c:"#f97316",
    tags:["Классик либерализм","Либертаризм","Минархизм","Объективизм"],
    desc:"Та чөлөөт зах зээл болон хувь хүний эрх чөлөөг дэмждэг. Засгийн газрын оролцоо хамгийн бага байх ёстой, хувийн өмч ба сайн дурын харилцан үйлчлэл нийгмийн үндэс гэж үздэг. Айн Рэнд, Фридрих Хаек, Рон Пол нарын үзэл санаатай нийцдэг."
  },
  al: {
    mn:"Авторитар Зүүнтэн", en:"Authoritarian Left", c:"#6366f1",
    tags:["Марксизм-Ленинизм","Маоизм","Улаан социализм","Төрийн социализм"],
    desc:"Та нийгмийн тэгш байдлыг хангахад хүчтэй, төвлөрсөн төрийн удирдлага зайлшгүй шаардлагатай гэж үздэг. Капиталист эдийн засгийг устгаж, нийгмийн эрх ашгийг тэргүүнд тавьдаг. Сталин, Мао Цзэдун, Фидель Кастро нарын тогтолцооны ойролцоо."
  },
  ar: {
    mn:"Авторитар Баруунтан", en:"Authoritarian Right", c:"#ef4444",
    tags:["Үндэсний консерватизм","Фашизм","Шашин дэмжих улс төр","Авторитар баруун"],
    desc:"Та уламжлалт үнэт зүйлс, хүчтэй засаглал, үндэсний нэгдмэл байдлыг эрхэмлэнэ. Гэр бүл, шашин, эх орны уламжлалт бүтцийг хамгаалахын тулд хүчтэй эрх мэдэл шаардлагатай гэж үздэг. Хитлер, Трамп, Путин нарын байрлалтай ойролцоо."
  },
};

const GENDER_OPTS = [
  {key:"male",label:"Эрэгтэй"},{key:"female",label:"Эмэгтэй"},{key:"other",label:"Бусад"},{key:"prefer_not",label:"Хэлэхгүй"},
];
const EDU_OPTS = [
  {key:"primary",label:"Бага/Дунд сургууль"},{key:"secondary",label:"Бүрэн дунд"},{key:"vocational",label:"Мэргэжлийн сургалт"},{key:"bachelor",label:"Бакалавр"},{key:"master",label:"Магистр"},{key:"phd",label:"Доктор/PhD"},
];
const G_LBL = Object.fromEntries(GENDER_OPTS.map(o=>[o.key,o.label]));
const E_LBL = Object.fromEntries(EDU_OPTS.map(o=>[o.key,o.label]));
const Q_LBL = {ll:"Либ. Зүүн",lr:"Либ. Баруун",al:"Авт. Зүүн",ar:"Авт. Баруун"};

/* Famous people (Economic, Social) — social: positive=authoritarian, negative=libertarian */
const FAMOUS = [
  {n:"Сталин",    e:-10, s:10,  c:"#6366f1"},
  {n:"Ким Жон Ун",e:-4,  s:9,   c:"#6366f1"},
  {n:"Гитлер",    e:1.8, s:8.9, c:"#ef4444"},
  {n:"Трамп",     e:7.1, s:8.5, c:"#ef4444"},
  {n:"Мао",       e:-10, s:6,   c:"#6366f1"},
  {n:"Обама",     e:6,   s:6,   c:"#ef4444"},
  {n:"Путин",     e:0,   s:4,   c:"#888"},
  {n:"Буш",       e:3,   s:3,   c:"#ef4444"},
  {n:"Рейган",    e:8,   s:2,   c:"#f97316"},
  {n:"Клинтон",   e:2,   s:2,   c:"#888"},
  {n:"AOC",       e:-9,  s:1,   c:"#10b981"},
  {n:"JFK",       e:0,   s:0,   c:"#888"},
  {n:"Сандерс",   e:-4,  s:0,   c:"#10b981"},
  {n:"Габбард",   e:-5,  s:-1,  c:"#10b981"},
  {n:"Вашингтон", e:1,   s:-1,  c:"#888"},
  {n:"Рон Пол",   e:9,   s:-1,  c:"#f97316"},
  {n:"Жэфферсон", e:7,   s:-3,  c:"#f97316"},
  {n:"Айн Рэнд",  e:6,   s:-4,  c:"#f97316"},
];

function BarChart({ data, colors }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
      {data.map((d,i) => (
        <div key={d.key} style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:100, fontSize:11, color:"#475569", textAlign:"right", flexShrink:0 }}>{d.label}</div>
          <div style={{ flex:1, background:"#0f172a", borderRadius:3, height:18, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(d.count/max)*100}%`, background:colors?colors[i%colors.length]:"#fbbf24", borderRadius:3, transition:"width 0.6s ease" }}/>
          </div>
          <div style={{ width:28, fontSize:11, color:"#475569", textAlign:"right", flexShrink:0 }}>{d.count}</div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [phase, setPhase]     = useState("intro");
  const [idx, setIdx]         = useState(0);
  const [cardKey, setCardKey] = useState(0);
  const [hist, setHist]       = useState([]);
  const [scores, setScores]   = useState({ econ:0, soc:0 });
  const [demo, setDemo]       = useState({ age:"", gender:"", education:"" });
  const [showFamous, setShowFamous] = useState(true);
  const [pinOverlay, setPinOverlay] = useState(false);
  const [pinInput, setPinInput]     = useState("");
  const [pinError, setPinError]     = useState(false);
  const [adminTab, setAdminTab]     = useState("stats");
  const [subs, setSubs]             = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [filterQuad, setFilterQuad] = useState("all");
  const [tablePage, setTablePage]   = useState(0);
  const [saving, setSaving]         = useState(false);
  const canvasRef = useRef(null);

  const getQK = ({ econ, soc }) => {
    if (econ <= 0 && soc <= 0) return "ll";
    if (econ > 0  && soc <= 0) return "lr";
    if (econ <= 0 && soc > 0)  return "al";
    return "ar";
  };

  const startQuiz = () => { setIdx(0); setHist([]); setCardKey(0); setPhase("demo"); };
  const isDemoOk = demo.age && parseInt(demo.age)>=16 && parseInt(demo.age)<=99 && demo.gender && demo.education;

  const pick = (answerIdx) => {
    const q = QUESTIONS[idx];
    const newHist = [...hist, { qi: q.i, ai: answerIdx }];
    setHist(newHist);
    if (idx < QUESTIONS.length - 1) {
      setCardKey(k=>k+1); setIdx(idx+1);
    } else {
      let eS=0, sS=0;
      newHist.forEach(({ qi, ai }) => { eS += ECONV[qi][ai]; sS += SOCV[qi][ai]; });
      const valE = +(eS/8.0+0.38).toFixed(2);
      const valS = +(sS/19.5+2.41).toFixed(2);
      const fs = { econ:Math.max(-10,Math.min(10,valE)), soc:Math.max(-10,Math.min(10,valS)) };
      setScores(fs); persist(fs); setPhase("result");
    }
  };

  const goBack = () => {
    if (idx===0) return;
    setHist(h=>h.slice(0,-1)); setCardKey(k=>k+1); setIdx(idx-1);
  };

  const persist = async (fs) => {
    setSaving(true);
    const entry = { ts:new Date().toISOString(), age:parseInt(demo.age), gender:demo.gender, education:demo.education, econ:fs.econ, soc:fs.soc, quad:getQK(fs) };
    try { await dbSave(entry); } catch(_) {}
    setSaving(false);
  };

  const loadSubs = async () => { setLoadingSubs(true); try{setSubs(await dbLoad());}catch(_){setSubs([]);} setLoadingSubs(false); };
  const openAdminLogin = () => { setPinInput(""); setPinError(false); setPinOverlay(true); };
  const checkPin = () => { if (pinInput===ADMIN_PIN) { setPinOverlay(false); setAdminTab("stats"); setFilterQuad("all"); setTablePage(0); loadSubs(); setPhase("admin"); } else { setPinError(true); } };

  const exportCSV = () => {
    const rows = [["ID","Огноо","Нас","Хүйс","Боловсрол","Эдийн засаг","Нийгэм","Байрлал"],
      ...filtered.slice().reverse().map(s=>[s.id||"",s.ts,s.age,G_LBL[s.gender]||s.gender,E_LBL[s.education]||s.education,s.econ,s.soc,Q_LBL[s.quad]||s.quad])];
    const csv = rows.map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="ulstoriin-luujin.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const clearAll = async () => { if (!window.confirm("Бүх өгөгдлийг устгах уу?")) return; try{await dbClear(); setSubs([]);}catch(_){} };

  useEffect(() => { if (phase==="result"&&canvasRef.current) drawCanvas(canvasRef.current, scores, showFamous); }, [phase, scores, showFamous]);

  const drawCanvas = (canvas, { econ, soc }, famous) => {
    const ctx = canvas.getContext("2d");
    const S=canvas.width, pad=52, half=(S-pad*2)/2, cx=S/2, cy=S/2;
    ctx.clearRect(0,0,S,S);

    /* Quadrant fills: positive soc = authoritarian = TOP (cy - half) */
    [{x:cx-half,y:cy-half,c:"#6366f1"},{x:cx,y:cy-half,c:"#ef4444"},
     {x:cx-half,y:cy,     c:"#10b981"},{x:cx,y:cy,     c:"#f97316"}]
      .forEach(({x,y,c}) => {
        const g=ctx.createRadialGradient(x+half/2,y+half/2,0,x+half/2,y+half/2,half);
        g.addColorStop(0,c+"28"); g.addColorStop(1,c+"06");
        ctx.fillStyle=g; ctx.fillRect(x,y,half,half);
      });

    /* Grid */
    ctx.strokeStyle="#ffffff0c"; ctx.lineWidth=1;
    for (let v=-8;v<=8;v+=4) {
      const gx=cx+(v/10)*half, gy=cy+(v/10)*half;
      ctx.beginPath(); ctx.moveTo(gx,cy-half); ctx.lineTo(gx,cy+half); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-half,gy); ctx.lineTo(cx+half,gy); ctx.stroke();
    }

    /* Axes */
    ctx.strokeStyle="#ffffff35"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(cx-half,cy); ctx.lineTo(cx+half,cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx,cy-half); ctx.lineTo(cx,cy+half); ctx.stroke();

    /* Axis labels */
    ctx.font="11px Arial,sans-serif"; ctx.fillStyle="#334155";
    ctx.textAlign="center";
    ctx.fillText("↑ Авторитар",cx,cy-half-10);
    ctx.fillText("Либертариан ↓",cx,cy+half+18);
    ctx.textAlign="left";  ctx.fillText("← Зүүн",cx-half,cy-7);
    ctx.textAlign="right"; ctx.fillText("Баруун →",cx+half,cy-7);

    /* Quadrant mini-labels: auth at top, lib at bottom */
    ctx.font="bold 9px Arial,sans-serif";
    [{x:cx-half/2,y:cy-half/2,c:"#6366f1",t:"Авт. Зүүн"},
     {x:cx+half/2,y:cy-half/2,c:"#ef4444",t:"Авт. Баруун"},
     {x:cx-half/2,y:cy+half/2,c:"#10b981",t:"Либ. Зүүн"},
     {x:cx+half/2,y:cy+half/2,c:"#f97316",t:"Либ. Баруун"}].forEach(({x,y,c,t})=>{
       ctx.fillStyle=c+"88"; ctx.textAlign="center"; ctx.fillText(t,x,y);
     });

    /* Famous people: positive soc = authoritarian = UP = py < cy */
    if (famous) {
      FAMOUS.forEach(f => {
        const fx=cx+(f.e/10)*half, fy=cy-(f.s/10)*half;
        ctx.fillStyle=f.c+"cc";
        ctx.beginPath(); ctx.arc(fx,fy,3.5,0,Math.PI*2); ctx.fill();
        ctx.font="7px Arial,sans-serif"; ctx.fillStyle=f.c+"ee"; ctx.textAlign="center";
        const ly = fy>cy+half-14 ? fy-5 : fy+12;
        ctx.fillText(f.n,fx,ly);
      });
    }

    /* User dot: positive soc = authoritarian = UP = py < cy */
    const px=cx+(econ/10)*half, py=cy-(soc/10)*half;

    const gg=ctx.createRadialGradient(px,py,0,px,py,28);
    gg.addColorStop(0,"#fbbf2466"); gg.addColorStop(1,"#fbbf2400");
    ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(px,py,28,0,Math.PI*2); ctx.fill();

    ctx.strokeStyle="#fbbf2435"; ctx.lineWidth=1; ctx.setLineDash([3,5]);
    ctx.beginPath(); ctx.moveTo(px,cy-half); ctx.lineTo(px,cy+half); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx-half,py); ctx.lineTo(cx+half,py); ctx.stroke();
    ctx.setLineDash([]);

    ctx.shadowColor="#fbbf24"; ctx.shadowBlur=20;
    ctx.fillStyle="#fbbf24"; ctx.beginPath(); ctx.arc(px,py,8,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;

    ctx.font="bold 10px Arial,sans-serif"; ctx.fillStyle="#fbbf24cc";
    const lx=px<cx?px+14:px-14, ly=py<cy-16?py+18:py-10;
    ctx.textAlign=px<cx?"left":"right";
    ctx.fillText(`(${econ>0?"+":""}${econ.toFixed(1)}, ${soc>0?"+":""}${soc.toFixed(1)})`,lx,ly);
  };

  const getQuad = () => QUADS[getQK(scores)];
  const q = QUESTIONS[idx];
  const qd = phase==="result" ? getQuad() : null;
  const ax = q ? qAxis(q.i) : null;

  /* Admin data */
  const filtered  = filterQuad==="all" ? subs : subs.filter(s=>s.quad===filterQuad);
  const PAGE=15, totalPg=Math.ceil(filtered.length/PAGE);
  const pageRows = filtered.slice().reverse().slice(tablePage*PAGE,(tablePage+1)*PAGE);
  const countBy = (key,opts) => opts.map(o=>({key:o.key,label:o.label,count:filtered.filter(s=>s[key]===o.key).length}));

  const card = { background:"#0c1221", border:"1px solid #131d2e", borderRadius:12 };
  const btn  = (active) => ({ padding:"8px 16px", border:"1px solid "+(active?"#fbbf24":"#131d2e"), borderRadius:6, background:active?"#fbbf2418":"transparent", color:active?"#fbbf24":"#475569", fontSize:12, cursor:"pointer", fontFamily:FONT });

  return (
    <div style={{ minHeight:"100vh", background:"#060a14", fontFamily:FONT, color:"#e2e8f0", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>

      {/* PIN OVERLAY */}
      {pinOverlay && (
        <div style={{ position:"fixed", inset:0, background:"#000000bb", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}
          onClick={e=>e.target===e.currentTarget&&setPinOverlay(false)}>
          <div style={{ ...card, padding:32, width:280, textAlign:"center" }}>
            <div style={{ fontSize:14, fontWeight:600, color:"#94a3b8", marginBottom:6 }}>Судлаачийн нэвтрэх</div>
            <div style={{ fontSize:11, color:"#334155", marginBottom:20 }}>PIN код оруулна уу</div>
            <input type="password" value={pinInput} autoFocus
              onChange={e=>{setPinInput(e.target.value);setPinError(false);}}
              onKeyDown={e=>e.key==="Enter"&&checkPin()}
              placeholder="••••"
              style={{ width:"100%", padding:"11px 14px", background:"#060a14", border:`1px solid ${pinError?"#ef4444":"#1e293b"}`, borderRadius:6, color:"#e2e8f0", fontSize:16, fontFamily:FONT, boxSizing:"border-box", marginBottom:8, outline:"none", textAlign:"center", letterSpacing:6 }}
            />
            {pinError && <div style={{ fontSize:11, color:"#ef4444", marginBottom:10 }}>Буруу PIN код</div>}
            <div style={{ display:"flex", gap:8, marginTop:4 }}>
              <button onClick={()=>setPinOverlay(false)} style={{ flex:1, padding:10, background:"transparent", border:"1px solid #131d2e", borderRadius:6, color:"#475569", fontSize:13, cursor:"pointer", fontFamily:FONT }}>Буцах</button>
              <button onClick={checkPin} style={{ flex:1, padding:10, background:"#fbbf24", border:"none", borderRadius:6, color:"#060a14", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>Нэвтрэх</button>
            </div>
          </div>
        </div>
      )}

      {/* INTRO */}
      {phase==="intro" && (
        <div style={{ maxWidth:360, width:"100%", textAlign:"center" }}>
          <div style={{ position:"relative", width:80, height:80, margin:"0 auto 32px" }}>
            <svg width="80" height="80" viewBox="0 0 80 80" style={{ position:"absolute" }}>
              <circle cx="40" cy="40" r="38" stroke="#131d2e" strokeWidth="1.5" fill="none"/>
              <circle cx="40" cy="40" r="28" stroke="#0f172a" strokeWidth="1" fill="none"/>
              <line x1="40" y1="4" x2="40" y2="76" stroke="#0f172a" strokeWidth="1"/>
              <line x1="4" y1="40" x2="76" y2="40" stroke="#0f172a" strokeWidth="1"/>
            </svg>
            <div style={{ position:"absolute", inset:0, animation:"needleWobble 6s ease-in-out infinite" }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <polygon points="40,9 37.5,40 40,38.5 42.5,40" fill="#fbbf24"/>
                <polygon points="40,71 37.5,40 40,41.5 42.5,40" fill="#1e2d42"/>
                <circle cx="40" cy="40" r="2.5" fill="#fbbf24"/>
              </svg>
            </div>
          </div>
          <p style={{ fontSize:10, letterSpacing:6, color:"#1e293b", marginBottom:14, textTransform:"uppercase" }}>Political Compass</p>
          <h1 style={{ fontSize:28, fontWeight:700, color:"#f8fafc", marginBottom:16, letterSpacing:-0.5 }}>Улс Төрийн Луужин</h1>
          <p style={{ color:"#475569", fontSize:13, lineHeight:1.85, marginBottom:48, maxWidth:300, margin:"0 auto 48px" }}>
            62 асуултаар таны улс төрийн үзэл баримтлалын байрлалыг эдийн засаг болон нийгмийн тэнхлэгт тодорхойлно.
          </p>
          <button onClick={startQuiz}
            style={{ padding:"13px 52px", background:"#fbbf24", border:"none", borderRadius:6, fontSize:14, fontWeight:700, color:"#060a14", cursor:"pointer", fontFamily:FONT, transition:"opacity 0.15s, transform 0.15s" }}
            onMouseEnter={e=>{e.currentTarget.style.opacity="0.85";e.currentTarget.style.transform="translateY(-1px)";}}
            onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.transform="translateY(0)";}}>
            Эхлэх
          </button>
          <div style={{ display:"flex", justifyContent:"center", gap:32, marginTop:32 }}>
            {[["62","асуулт"],["~20 мин","хугацаа"],["2","тэнхлэг"]].map(([v,l])=>(
              <div key={l}><div style={{ fontSize:15, fontWeight:700, color:"#334155" }}>{v}</div><div style={{ fontSize:11, color:"#1e293b", marginTop:2 }}>{l}</div></div>
            ))}
          </div>
          <button onClick={openAdminLogin} style={{ marginTop:44, background:"none", border:"none", color:"#1e293b", fontSize:11, cursor:"pointer", fontFamily:FONT, letterSpacing:1 }}>
            Судлаач →
          </button>
        </div>
      )}

      {/* DEMO */}
      {phase==="demo" && (
        <div style={{ maxWidth:480, width:"100%", animation:"cardIn 0.2s ease forwards" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:10, letterSpacing:4, color:"#334155", marginBottom:10, textTransform:"uppercase" }}>Судалгааны мэдээлэл</div>
            <h2 style={{ fontSize:22, fontWeight:700, color:"#f1f5f9", marginBottom:8 }}>Товч мэдээллээ оруулна уу</h2>
            <p style={{ fontSize:13, color:"#475569" }}>Судалгааны зорилгоор ашиглана. Хувийн мэдээлэл хадгалагдахгүй.</p>
          </div>
          <div style={{ ...card, padding:"20px 24px", marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#475569", marginBottom:12, letterSpacing:1, textTransform:"uppercase" }}>Нас</div>
            <input type="number" min="16" max="99" value={demo.age}
              onChange={e=>setDemo(d=>({...d,age:e.target.value}))} placeholder="Жишээ: 24"
              style={{ width:"100%", padding:"10px 14px", background:"#060a14", border:"1px solid #1e293b", borderRadius:6, color:"#e2e8f0", fontSize:16, fontFamily:FONT, boxSizing:"border-box", outline:"none" }}/>
          </div>
          <div style={{ ...card, padding:"20px 24px", marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#475569", marginBottom:12, letterSpacing:1, textTransform:"uppercase" }}>Хүйс</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {GENDER_OPTS.map(o=>(
                <button key={o.key} onClick={()=>setDemo(d=>({...d,gender:o.key}))}
                  style={{ padding:"10px", background:demo.gender===o.key?"#fbbf2418":"transparent", border:`1px solid ${demo.gender===o.key?"#fbbf24":"#1e293b"}`, borderRadius:6, color:demo.gender===o.key?"#fbbf24":"#64748b", fontSize:13, cursor:"pointer", fontFamily:FONT }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ ...card, padding:"20px 24px", marginBottom:24 }}>
            <div style={{ fontSize:11, color:"#475569", marginBottom:12, letterSpacing:1, textTransform:"uppercase" }}>Боловсролын зэрэг</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {EDU_OPTS.map(o=>(
                <button key={o.key} onClick={()=>setDemo(d=>({...d,education:o.key}))}
                  style={{ padding:"10px 12px", background:demo.education===o.key?"#fbbf2418":"transparent", border:`1px solid ${demo.education===o.key?"#fbbf24":"#1e293b"}`, borderRadius:6, color:demo.education===o.key?"#fbbf24":"#64748b", fontSize:12, cursor:"pointer", fontFamily:FONT, textAlign:"left" }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={()=>setPhase("quiz")} disabled={!isDemoOk}
            style={{ width:"100%", padding:"13px", background:isDemoOk?"#fbbf24":"#131d2e", border:"none", borderRadius:6, color:isDemoOk?"#060a14":"#334155", fontSize:14, fontWeight:700, cursor:isDemoOk?"pointer":"default", fontFamily:FONT }}>
            Үргэлжлүүлэх →
          </button>
        </div>
      )}

      {/* QUIZ */}
      {phase==="quiz" && q && (
        <div style={{ maxWidth:600, width:"100%" }}>
          <div style={{ display:"flex", alignItems:"center", marginBottom:10 }}>
            <button onClick={goBack} disabled={idx===0}
              style={{ background:"none", border:"none", padding:"6px 12px 6px 0", color:idx===0?"#131d2e":"#475569", cursor:idx===0?"default":"pointer", fontSize:20, fontFamily:FONT, lineHeight:1 }}>←</button>
            <div style={{ flex:1, textAlign:"center" }}>
              <span style={{ fontSize:11, color:"#334155", letterSpacing:1 }}>{idx+1} / {QUESTIONS.length}</span>
            </div>
            <div style={{ width:44 }}/>
          </div>
          <div style={{ background:"#0c1221", borderRadius:3, height:2, marginBottom:24, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${((idx+1)/QUESTIONS.length)*100}%`, background:"#fbbf24", borderRadius:3, transition:"width 0.35s ease" }}/>
          </div>
          <div key={cardKey} style={{ ...card, padding:"28px 24px", marginBottom:14, animation:"cardIn 0.2s ease forwards" }}>
            {ax && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:ax==="economic"?"#fbbf24":"#818cf8", flexShrink:0 }}/>
                <span style={{ fontSize:10, letterSpacing:2.5, color:ax==="economic"?"#fbbf24":"#818cf8", textTransform:"uppercase" }}>
                  {ax==="economic"?"Эдийн засаг":"Нийгэм"}
                </span>
              </div>
            )}
            <p style={{ fontSize:17, lineHeight:1.72, color:"#e2e8f0", margin:0 }}>{q.mn}</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {CHOICES.map(ch=>(
              <button key={ch.key} onClick={()=>pick(ch.ai)}
                style={{ padding:"13px 14px", background:`${ch.c}10`, border:`1px solid ${ch.c}28`, borderLeft:`3px solid ${ch.c}`, borderRadius:"0 8px 8px 0", color:ch.c, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:FONT, textAlign:"left", transition:"background 0.12s" }}
                onMouseEnter={e=>e.currentTarget.style.background=`${ch.c}20`}
                onMouseLeave={e=>e.currentTarget.style.background=`${ch.c}10`}>
                {ch.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase==="result" && qd && (
        <div style={{ maxWidth:500, width:"100%", textAlign:"center" }}>
          <div style={{ fontSize:9, letterSpacing:5, color:"#1e293b", marginBottom:12, textTransform:"uppercase" }}>Таны үр дүн</div>
          <h2 style={{ fontSize:26, fontWeight:700, color:qd.c, marginBottom:4 }}>{qd.mn}</h2>
          <p style={{ fontSize:12, color:"#334155", marginBottom:14 }}>{qd.en}</p>

          {/* Ideology tags */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center", marginBottom:16 }}>
            {qd.tags.map(t=>(
              <span key={t} style={{ padding:"3px 10px", background:qd.c+"18", border:`1px solid ${qd.c}44`, borderRadius:100, fontSize:11, color:qd.c }}>
                {t}
              </span>
            ))}
          </div>

          <p style={{ fontSize:13, color:"#475569", lineHeight:1.78, maxWidth:400, margin:"0 auto 20px" }}>{qd.desc}</p>

          {/* Canvas */}
          <div style={{ ...card, padding:14, marginBottom:10, display:"inline-block" }}>
            <canvas ref={canvasRef} width={360} height={360} style={{ display:"block", maxWidth:"100%" }}/>
          </div>

          {/* Famous toggle */}
          <div style={{ marginBottom:18 }}>
            <button onClick={()=>setShowFamous(f=>!f)}
              style={{ background:"transparent", border:"1px solid #131d2e", borderRadius:6, color:"#475569", fontSize:11, padding:"6px 14px", cursor:"pointer", fontFamily:FONT }}>
              {showFamous?"● Алдартнуудыг нуух":"○ Алдартнуудыг харах"}
            </button>
          </div>

          {/* Score bars */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
            {[
              {label:"Эдийн засаг",val:scores.econ, neg:"Зүүн",      pos:"Баруун",      c:"#fbbf24"},
              {label:"Нийгэм",     val:scores.soc,  neg:"Либертариан",pos:"Авторитар",  c:"#818cf8"},
            ].map(s=>(
              <div key={s.label} style={{ ...card, padding:"14px 16px", textAlign:"left" }}>
                <div style={{ fontSize:9, color:"#1e293b", marginBottom:6, textTransform:"uppercase", letterSpacing:2 }}>{s.label}</div>
                <div style={{ fontSize:24, fontWeight:700, color:s.c, marginBottom:10, letterSpacing:-1 }}>
                  {s.val>0?"+":""}{s.val.toFixed(1)}
                </div>
                <div style={{ background:"#0f172a", borderRadius:3, height:4, position:"relative" }}>
                  <div style={{ position:"absolute", top:0, height:"100%", borderRadius:3, background:s.c, left:s.val>=0?"50%":`${50+(s.val/10)*50}%`, width:`${Math.abs(s.val/10)*50}%` }}/>
                  <div style={{ position:"absolute", top:-2, left:"calc(50% - 1px)", width:2, height:8, background:"#1e293b", borderRadius:1 }}/>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:5, fontSize:9, color:"#1e293b" }}>
                  <span>{s.neg}</span><span>{s.pos}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Save status */}
          <div style={{ ...card, padding:"12px 18px", marginBottom:18, textAlign:"left" }}>
            <div style={{ fontSize:11, color:"#334155" }}>
              {saving ? "Өгөгдөл хадгалж байна…" : "✓ Таны хариулт судалгаанд амжилттай бүртгэгдлээ"}
            </div>
          </div>

          <button onClick={()=>{ setDemo({age:"",gender:"",education:""}); setPhase("intro"); setIdx(0); setHist([]); setCardKey(0); }}
            style={{ padding:"10px 28px", background:"transparent", border:"1px solid #131d2e", borderRadius:6, color:"#475569", fontSize:12, cursor:"pointer", fontFamily:FONT }}>
            ↩ Дахин эхлэх
          </button>
        </div>
      )}

      {/* ADMIN */}
      {phase==="admin" && (
        <div style={{ maxWidth:820, width:"100%" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontSize:10, letterSpacing:4, color:"#334155", textTransform:"uppercase", marginBottom:4 }}>Судалгааны удирдлага</div>
              <h2 style={{ fontSize:20, fontWeight:700, color:"#f1f5f9", margin:0 }}>Political Compass CMS</h2>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={loadSubs} style={{ ...btn(false) }}>{loadingSubs?"⟳":"↺"} Шинэчлэх</button>
              <button onClick={exportCSV} disabled={filtered.length===0} style={{ ...btn(false), color:filtered.length===0?"#1e293b":"#10b981", borderColor:filtered.length===0?"#0f172a":"#10b98140" }}>↓ CSV татах</button>
              <button onClick={clearAll} style={{ ...btn(false), color:"#ef4444", borderColor:"#ef444430" }}>Устгах</button>
              <button onClick={()=>setPhase("intro")} style={{ ...btn(false) }}>← Гарах</button>
            </div>
          </div>

          {!HAS_SB&&!HAS_WS&&(
            <div style={{ background:"#ef444415", border:"1px solid #ef444440", borderRadius:8, padding:"12px 16px", marginBottom:16, fontSize:12, color:"#f87171" }}>
              ⚠ Өгөгдлийн сан холбогдоогүй байна.<br/>
              <span style={{ color:"#64748b", fontSize:11 }}>
                Vercel → Settings → Environment Variables дээр <strong style={{color:"#94a3b8"}}>VITE_SUPABASE_URL</strong> болон <strong style={{color:"#94a3b8"}}>VITE_SUPABASE_KEY</strong> нэмээд Redeploy хийнэ үү.
              </span>
            </div>
          )}
          {HAS_WS&&!HAS_SB&&(
            <div style={{ background:"#fbbf2415", border:"1px solid #fbbf2440", borderRadius:8, padding:"10px 16px", marginBottom:16, fontSize:12, color:"#fbbf24" }}>
              ○ Artifact storage ашиглаж байна — зөвхөн энэ хуудсанд харагдана
            </div>
          )}

          <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:"#475569", alignSelf:"center", marginRight:4 }}>Байрлал:</span>
            {[["all","Бүгд"],...Object.entries(Q_LBL)].map(([k,l])=>(
              <button key={k} onClick={()=>{setFilterQuad(k);setTablePage(0);}}
                style={{ ...btn(filterQuad===k), borderColor:filterQuad===k?(QUADS[k]?.c||"#fbbf24"):"#131d2e", color:filterQuad===k?(QUADS[k]?.c||"#fbbf24"):"#475569", background:filterQuad===k?((QUADS[k]?.c||"#fbbf24")+"18"):"transparent" }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", gap:2, marginBottom:20, borderBottom:"1px solid #131d2e" }}>
            {[["stats","Статистик"],["table","Хүснэгт"]].map(([t,l])=>(
              <button key={t} onClick={()=>setAdminTab(t)}
                style={{ padding:"9px 20px", background:"none", border:"none", borderBottom:adminTab===t?"2px solid #fbbf24":"2px solid transparent", color:adminTab===t?"#fbbf24":"#475569", fontSize:13, fontWeight:adminTab===t?700:400, cursor:"pointer", fontFamily:FONT, marginBottom:-1 }}>
                {l}
              </button>
            ))}
          </div>

          {loadingSubs && <div style={{ textAlign:"center", color:"#475569", padding:40 }}>Ачааллаж байна…</div>}

          {!loadingSubs && adminTab==="stats" && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:24 }}>
                {[
                  {label:"Нийт оролцогч", val:filtered.length, c:"#fbbf24"},
                  {label:"Дундаж нас",    val:filtered.length?(filtered.reduce((s,b)=>s+(b.age||0),0)/filtered.length).toFixed(1):"—", c:"#60a5fa"},
                  {label:"Эд. засаг avg", val:filtered.length?(filtered.reduce((s,b)=>s+b.econ,0)/filtered.length).toFixed(1):"—", c:"#10b981"},
                  {label:"Нийгэм avg",    val:filtered.length?(filtered.reduce((s,b)=>s+b.soc,0)/filtered.length).toFixed(1):"—", c:"#818cf8"},
                ].map(s=>(
                  <div key={s.label} style={{ ...card, padding:"16px", textAlign:"center" }}>
                    <div style={{ fontSize:26, fontWeight:700, color:s.c, marginBottom:4 }}>{s.val}</div>
                    <div style={{ fontSize:10, color:"#334155", textTransform:"uppercase", letterSpacing:1 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {filtered.length===0
                ? <div style={{ textAlign:"center", color:"#1e293b", padding:"60px 0", fontSize:14 }}>Өгөгдөл байхгүй байна</div>
                : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <div style={{ ...card, padding:"20px 22px" }}>
                    <div style={{ fontSize:11, color:"#475569", marginBottom:16, textTransform:"uppercase", letterSpacing:1 }}>Байрлалын тархалт</div>
                    <BarChart data={["ll","lr","al","ar"].map(k=>({key:k,label:Q_LBL[k],count:filtered.filter(s=>s.quad===k).length}))} colors={["#10b981","#f97316","#6366f1","#ef4444"]}/>
                  </div>
                  <div style={{ ...card, padding:"20px 22px" }}>
                    <div style={{ fontSize:11, color:"#475569", marginBottom:16, textTransform:"uppercase", letterSpacing:1 }}>Хүйс</div>
                    <BarChart data={countBy("gender",GENDER_OPTS)} colors={["#60a5fa","#f472b6","#94a3b8","#475569"]}/>
                  </div>
                  <div style={{ ...card, padding:"20px 22px", gridColumn:"1/-1" }}>
                    <div style={{ fontSize:11, color:"#475569", marginBottom:16, textTransform:"uppercase", letterSpacing:1 }}>Боловсролын зэрэг</div>
                    <BarChart data={countBy("education",EDU_OPTS)} colors={["#818cf8","#818cf8","#818cf8","#818cf8","#818cf8","#818cf8"]}/>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loadingSubs && adminTab==="table" && (
            <div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr>{["№","Огноо","Нас","Хүйс","Боловсрол","Эдийн засаг","Нийгэм","Байрлал"].map(h=>(
                      <th key={h} style={{ padding:"10px 12px", textAlign:"left", color:"#334155", fontWeight:600, borderBottom:"1px solid #131d2e", whiteSpace:"nowrap" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {pageRows.length===0
                      ? <tr><td colSpan={8} style={{ padding:"40px", textAlign:"center", color:"#1e293b" }}>Өгөгдөл байхгүй</td></tr>
                      : pageRows.map((s,i)=>(
                        <tr key={s.id||i} style={{ borderBottom:"1px solid #0a0f1e" }}
                          onMouseEnter={e=>e.currentTarget.style.background="#0c1221"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <td style={{ padding:"9px 12px", color:"#334155" }}>{tablePage*PAGE+i+1}</td>
                          <td style={{ padding:"9px 12px", color:"#64748b", whiteSpace:"nowrap" }}>{s.ts?new Date(s.ts).toLocaleString("mn-MN",{dateStyle:"short",timeStyle:"short"}):""}</td>
                          <td style={{ padding:"9px 12px", color:"#94a3b8" }}>{s.age}</td>
                          <td style={{ padding:"9px 12px", color:"#94a3b8" }}>{G_LBL[s.gender]||s.gender}</td>
                          <td style={{ padding:"9px 12px", color:"#94a3b8" }}>{E_LBL[s.education]||s.education}</td>
                          <td style={{ padding:"9px 12px", color:"#fbbf24", fontWeight:600 }}>{s.econ>0?"+":""}{(+s.econ).toFixed(1)}</td>
                          <td style={{ padding:"9px 12px", color:"#818cf8", fontWeight:600 }}>{s.soc>0?"+":""}{(+s.soc).toFixed(1)}</td>
                          <td style={{ padding:"9px 12px" }}>
                            <span style={{ padding:"3px 9px", background:(QUADS[s.quad]?.c||"#64748b")+"20", color:QUADS[s.quad]?.c||"#64748b", borderRadius:4, fontSize:11, whiteSpace:"nowrap" }}>
                              {Q_LBL[s.quad]||s.quad}
                            </span>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
              {totalPg>1 && (
                <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:12, marginTop:20 }}>
                  <button onClick={()=>setTablePage(p=>Math.max(0,p-1))} disabled={tablePage===0} style={{ ...btn(false), opacity:tablePage===0?0.3:1 }}>← Өмнөх</button>
                  <span style={{ fontSize:12, color:"#475569" }}>{tablePage+1} / {totalPg}</span>
                  <button onClick={()=>setTablePage(p=>Math.min(totalPg-1,p+1))} disabled={tablePage>=totalPg-1} style={{ ...btn(false), opacity:tablePage>=totalPg-1?0.3:1 }}>Дараах →</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes needleWobble {
          0%{transform:rotate(-12deg);}20%{transform:rotate(8deg);}40%{transform:rotate(-4deg);}60%{transform:rotate(6deg);}80%{transform:rotate(-3deg);}100%{transform:rotate(-12deg);}
        }
        @keyframes cardIn {
          from{opacity:0;transform:translateY(10px) scale(0.99);}
          to{opacity:1;transform:translateY(0) scale(1);}
        }
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        input:focus{border-color:#fbbf2466!important;}
      `}</style>
    </div>
  );
}
