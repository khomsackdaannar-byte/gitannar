// ------------------- ໝວດໝູ່ຄົງທີ່ ໃຊ້ສຳລັບ filter (ຫ້າມປ່ຽນ) -------------------
export const TechCategory = {
  electric: "electric",
  plumbing: "plumbing",
  beauty: "beauty",
  carRepair: "car_repair",
  phoneRepair: "phone_repair",
} as const;

export type TechCategoryType = (typeof TechCategory)[keyof typeof TechCategory];

// ------------------- ໂຄງສ້າງຂໍ້ມູນຊ່າງ -------------------
export interface Technician {
  name: string;
  type: string;
  category: TechCategoryType;
  phone: string;
  area: string;
  hometown: string;
  birthDate: string;
  age: string;
  rating: number;
  icon: string;
  image?: string;
}

// ------------------- ຂໍ້ມູນຈຳລອງ -------------------
export const techList: Technician[] = [
  { name: "ທ້າວ ສົມສັກ ພັນທະວົງ", type: "ຊ່າງສ້ອມແປງໄຟຟ້າ", category: TechCategory.electric, phone: "02055512345", area: "ເມືອງໄຊທານີ", hometown: "ບ້ານໂພນເຄັງ ເມືອງໄຊເສດຖາ ນະຄອນຫລວງວຽງຈັນ", birthDate: "20/03/1995", age: "31", rating: 4.8, icon: "electrical_services", image: "/assets/images/somsack.jpg" },
  { name: "ນາງ ເຈ່ນນີ່ ທຳມະວົງ", type: "ຊ່າງສ້ອມແປງໄຟຟ້າ", category: TechCategory.electric, phone: "02099988877", area: "ເມືອງໄຊເສດຖາ", hometown: "ບ້ານໂພນເຄັງ ເມືອງໄຊເສດຖາ ນະຄອນຫລວງວຽງຈັນ", birthDate: "20/03/1995", age: "31", rating: 4.5, icon: "electrical_services", image: "/assets/images/jenny.jpg" },
  { name: "ທ້າວ ເກດສະຫນາ ວຽງໄຊ", type: "ຊ່າງສ້ອມແປງໄຟຟ້າ", category: TechCategory.electric, phone: "02077665599", area: "ເມືອງສີສັດຕະນາກ", hometown: "ບ້ານໂສກປ່າຫລວງ ເມືອງສີສັດຕະນາກ ນະຄອນຫລວງວຽງຈັນ", birthDate: "18/11/1987", age: "39", rating: 4.8, icon: "electrical_services", image: "/assets/images/avern.jpg" },
  { name: "ທ້າວ ອາຫລົງ ນັນທະວົງ", type: "ຊ່າງສ້ອມແປງໄຟຟ້າ", category: TechCategory.electric, phone: "02055544789", area: "ເມືອງນາຊາຍທອງ", hometown: "ບ້ານອີໄລ່ ເມືອງນາຊາຍທອງ ນະຄອນຫລວງວຽງຈັນ", birthDate: "21/03/2000", age: "26", rating: 4.9, icon: "electrical_services", image: "/assets/images/along.jpg" },
  { name: "ທ້າວ ແສງໄຊ ວົງສາ", type: "ຊ່າງສ້ອມແປງໄຟຟ້າ", category: TechCategory.electric, phone: "02055512345", area: "ເມືອງໄຊທານີ", hometown: "ບ້ານດອນຫນູ ເມືອງໄຊທານີ ນະຄອນຫລວງວຽງຈັນ", birthDate: "29/05/1990", age: "36", rating: 4.8, icon: "electrical_services", image: "/assets/images/saengxai.jpg" },
  { name: "ທ້າວ ບຸນມີ ກິ່ງແກ້ວ", type: "ຊ່າງສ້ອມແປງນ້ຳປະປາ", category: TechCategory.plumbing, phone: "02077712121", area: "ເມືອງຈັນທະບູລີ", hometown: "ບ້ານໂພນເຄັງ ເມືອງໄຊເສດຖາ ນະຄອນຫລວງວຽງຈັນ", birthDate: "20/03/1995", age: "31", rating: 4.9, icon: "plumbing" },
  { name: "ນາງ ຄຳຫຼ້າ ແສງສະຫວ່າງ", type: "ຊ່າງສ້ອມແປງນ້ຳປະປາ", category: TechCategory.plumbing, phone: "02088854321", area: "ເມືອງສີໂຄດຕະບອງ", hometown: "ບ້ານໂພນເຄັງ ເມືອງໄຊເສດຖາ ນະຄອນຫລວງວຽງຈັນ", birthDate: "20/03/1995", age: "31", rating: 4.3, icon: "plumbing" },
  { name: "ທ້າວ ບຸນຫລາຍ ມີບຸນມາກ", type: "ຊ່າງສ້ອມແປງນ້ຳປະປາ", category: TechCategory.plumbing, phone: "02077714455", area: "ເມືອງປາກງື່ມ", hometown: "ບ້ານນາບົງ ເມືອງປາກງື່ມ ນະຄອນຫລວງວຽງຈັນ", birthDate: "20/03/2003", age: "23", rating: 4.7, icon: "plumbing" },
  { name: "ທ້າວ ເກດສະດາ ຈັນດາລາ", type: "ຊ່າງສ້ອມແປງນ້ຳປະປາ", category: TechCategory.plumbing, phone: "0207776789", area: "ເມືອງປາກງື່ມ", hometown: "ບ້ານທ່າກົກໄຮ ເມືອງປາກງື່ມ ນະຄອນຫລວງວຽງຈັນ", birthDate: "20/11/1988", age: "38", rating: 4.5, icon: "plumbing" },
  { name: "ທ້າວ ທະນົງໄຊ ດວງດາລາ", type: "ຊ່າງສ້ອມແປງນ້ຳປະປາ", category: TechCategory.plumbing, phone: "02099887722", area: "ເມືອງໄຊທານີ", hometown: "ບ້ານດົງໂດກ ເມືອງໄຊທານີ ນະຄອນຫລວງວຽງຈັນ", birthDate: "23/12/1995", age: "31", rating: 4.2, icon: "plumbing", image: "/assets/images/sunny.jpg" },
  { name: "ທ້າວ ອິງ ກົງສະຫວັນ", type: "ຊ່າງສ້ອມແປງນ້ຳປະປາ", category: TechCategory.plumbing, phone: "02055443377", area: "ເມືອງຫາດຊາຍຟອງ", hometown: "ບ້ານຄວາຍແດງ ເມືອງຫາດຊາຍຟອງ ນະຄອນຫລວງວຽງຈັນ", birthDate: "20/09/1999", age: "27", rating: 4.5, icon: "plumbing" },
  { name: "ທ້າວ ສຸກັນຍາ ເລີດສັກດາ", type: "ຊ່າງສ້ອມແປງນ້ຳປະປາ", category: TechCategory.plumbing, phone: "02077890989", area: "ເມືອງສີໂຄດຕະບອງ", hometown: "ບ້ານອາກາດ ເມືອງສີໂຄດຕະບອງ ນະຄອນຫລວງວຽງຈັນ", birthDate: "20/12/1996", age: "29", rating: 4.3, icon: "plumbing" },
  { name: "ນາງ ສຸກສະຫວັນ ແກ້ວມະນີ", type: "ຊ່າງເສີມສວຍ", category: TechCategory.beauty, phone: "02011122334", area: "ເມືອງຈັນທະບູລີ", hometown: "ບ້ານດົງປ່າແຫຼບ ເມືອງຈັນທະບູລີ ນະຄອນຫລວງວຽງຈັນ", birthDate: "05/06/1997", age: "29", rating: 4.7, icon: "content_cut" },
  { name: "ນາງ ອາລິສາ ວົງສະຫວັນ", type: "ຊ່າງເສີມສວຍ", category: TechCategory.beauty, phone: "02099887766", area: "ເມືອງໄຊເສດຖາ", hometown: "ບ້ານໂພນພະເນົາ ເມືອງໄຊເສດຖາ ນະຄອນຫລວງວຽງຈັນ", birthDate: "18/12/1999", age: "26", rating: 4.6, icon: "content_cut" },
  { name: "ນາງ ສາ ພະສະຫວັດ", type: "ຊ່າງເສີມສວຍ", category: TechCategory.beauty, phone: "02099883322", area: "ເມືອງໄຊເສດຖາ", hometown: "ບ້ານອາກາດ ເມືອງສີໂຄດຕະະບອງ ນະຄອນຫລວງວຽງຈັນ", birthDate: "18/12/1995", age: "29", rating: 4.6, icon: "content_cut" },
  { name: "ນາງ ກັນຕິຊາ ພອນປານີ", type: "ຊ່າງເສີມສວຍ", category: TechCategory.beauty, phone: "02077665544", area: "ເມືອງສີໂຄດຕະບອງ", hometown: "ບ້ານໂນນແກ້ວ ເມືອງສີໂຄດຕະບອງ ນະຄອນຫລວງວຽງຈັນ", birthDate: "23/12/2005", age: "21", rating: 4.9, icon: "content_cut" },
  { name: "ນາງ ພອນມະນີ ແກ້ວປະເສີດ", type: "ຊ່າງເສີມສວຍ", category: TechCategory.beauty, phone: "02099844336", area: "ເມືອງໄຊທານີ", hometown: "ບ້ານສີວິໄລ ເມືອງໄຊທານີ ນະຄອນຫລວງວຽງຈັນ", birthDate: "18/12/2004", age: "22", rating: 4.0, icon: "content_cut" },
  { name: "ນາງ ຕາດຳ", type: "ເສີມສວຍ", category: TechCategory.beauty, phone: "02099887766", area: "ເມືອງໄຊເສດຖາ", hometown: "ບ້ານໂນນຄໍ້ ເມືອງໄຊເສດຖາ ນະຄອນຫລວງວຽງຈັນ", birthDate: "18/01/1988", age: "38", rating: 4.9, icon: "content_cut" },
  { name: "ທ້າວ ວິໄລ ອິນທະວົງ", type: "ຊ່າງສ້ອມແປງລົດ", category: TechCategory.carRepair, phone: "02077889900", area: "ເມືອງຫາດຊາຍຟອງ", hometown: "ບ້ານຄວາຍແດງ ເມືອງຫາດຊາຍຟອງ ນະຄອນຫລວງວຽງຈັນ", birthDate: "11/09/1990", age: "35", rating: 4.8, icon: "car_repair" },
  { name: "ທ້າວ ຄຳສີ ບົວລະພັນ", type: "ຊ່າງສ້ອມແປງລົດ", category: TechCategory.carRepair, phone: "02055667788", area: "ເມືອງນາຊາຍທອງ", hometown: "ບ້ານຊຳເກດ ເມືອງນາຊາຍທອງ ນະຄອນຫລວງວຽງຈັນ", birthDate: "02/02/1988", age: "38", rating: 4.5, icon: "car_repair" },
  { name: "ທ້າວ ໂອເລ້", type: "ຊ່າງສ້ອມແປງລົດ", category: TechCategory.carRepair, phone: "02055667789", area: "ເມືອງໄຊທານີ", hometown: "ບ້ານຄຳຮຸ່ງ ເມືອງໄຊທານີ ນະຄອນຫລວງວຽງຈັນ", birthDate: "02/02/1988", age: "38", rating: 4.5, icon: "car_repair" },
  { name: "ທ້າວ ພຸດໄຊ ສີສົມພອນ", type: "ຊ່າງສ້ອມແປງລົດ", category: TechCategory.carRepair, phone: "02055667756", area: "ເມືອງໄຊທານີ", hometown: "ບ້ານດົງໂດກ ເມືອງໄຊທານີ ນະຄອນຫລວງວຽງຈັນ", birthDate: "02/02/2002", age: "24", rating: 4.5, icon: "car_repair" },
  { name: "ທ້າວ ເຈດສະດາ ພົງສະກຸນ", type: "ຊ່າງສ້ອມແປງລົດ", category: TechCategory.carRepair, phone: "02055667757", area: "ເມືອງປາກງື່ມ", hometown: "ບ້ານພ້າວ ເມືອງປາກງື່ມ ນະຄອນຫລວງວຽງຈັນ", birthDate: "24/02/2000", age: "26", rating: 4.5, icon: "car_repair" },
  { name: "ທ້າວ ໄຊຍະສິດ ພົມມະວົງ", type: "ຊ່າງສ້ອມແປງໂທລະສັບ", category: TechCategory.phoneRepair, phone: "02099001122", area: "ເມືອງຈັນທະບູລີ", hometown: "ບ້ານທົ່ງກາງ ເມືອງຈັນທະບູລີ ນະຄອນຫລວງວຽງຈັນ", birthDate: "25/04/1996", age: "30", rating: 4.9, icon: "phone_android" },
  { name: "ນາງ ວັນນະລີ ແສງດາລາ", type: "ຊ່າງສ້ອມແປງໂທລະສັບ", category: TechCategory.phoneRepair, phone: "02088990011", area: "ເມືອງໄຊເສດຖາ", hometown: "ບ້ານໜອງບອນ ເມືອງໄຊເສດຖາ ນະຄອນຫລວງວຽງຈັນ", birthDate: "14/08/1998", age: "27", rating: 4.4, icon: "phone_android" },
  { name: "ນາງ ແສງດາລາ ພົງສະຫວັນ", type: "ຊ່າງສ້ອມແປງໂທລະສັບ", category: TechCategory.phoneRepair, phone: "02088990012", area: "ເມືອງໄຊເສດຖາ", hometown: "ບ້ານໜອງບອນ ເມືອງ ໄຊເສດຖາ ນະຄອນຫລວງວຽງຈັນ", birthDate: "14/02/1999", age: "28", rating: 4.4, icon: "phone_android" },
  { name: "ນາງ ລຸ້ງຕາວັນ ຈັນທະວົງສາ", type: "ຊ່າງສ້ອມແປງໂທລະສັບ", category: TechCategory.phoneRepair, phone: "02088990013", area: "ເມືອງຫາດຊາຍຟອງ", hometown: "ບ້ານຊຽງຄວນ ເມືອງຫາດຊາຍຟອງ ນະຄອນຫລວງວຽງຈັນ", birthDate: "05/12/2005", age: "21", rating: 4.8, icon: "phone_android", image: "/assets/images/loung.jpg" },
  { name: "ທ້າວ ຄຳພອນ", type: "ຊ່າງສ້ອມແປງໂທລະສັບ", category: TechCategory.phoneRepair, phone: "02088990014", area: "ເມືອງສັງທອງ", hometown: "ບ້ານຫ້ວຍສະນອດ ເມືອງສັງທອງ ນະຄອນຫລວງວຽງຈັນ", birthDate: "02/09/2001", age: "25", rating: 4.6, icon: "phone_android" },
   { name: "ທ້າວ ຄຳພອນ ຄົມສັກດາ", type: "ຊ່າງສ້ອມແປງໂທລະສັບ", category: TechCategory.phoneRepair, phone: "02088990014", area: "ເມືອງສັງທອງ", hometown: "ບ້ານຫ້ວຍສະນອດ ເມືອງສັງທອງ ນະຄອນຫລວງວຽງຈັນ", birthDate: "02/09/2001", age: "25", rating: 4.6, icon: "phone_android" },
];