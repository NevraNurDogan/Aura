import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase';

// Esma-ül Hüsna (Allah'ın 99 İsmi)
const ESMA_UL_HUSNA = [
  { isim: "Er-Rahmân", arapca: "الرَّحْمَنُ", anlam: "Dünyada bütün mahlûkata merhamet eden, şefkat gösteren.", zikir: 298, fazilet: "Kalbin ferahlaması ve rızkın bereketi için okunur." },
  { isim: "Er-Rahîm", arapca: "الرَّحِيمُ", anlam: "Ahirette sadece müminlere merhamet eden, bağışlayan.", zikir: 258, fazilet: "Maddi ve manevi huzur bulmak için zikredilir." },
  { isim: "El-Melik", arapca: "الْمَلِكُ", anlam: "Bütün kâinatın tek sahibi ve mutlak hükümdarı.", zikir: 90, fazilet: "Gönül zenginliği ve itibar elde etmek için okunur." },
  { isim: "El-Kuddûs", arapca: "الْقُدُّوسُ", anlam: "Her türlü noksanlıktan uzak, pek temiz ve yüce.", zikir: 170, fazilet: "Ruhsal sıkıntılardan ve kötü huylardan arınmaya vesiledir." },
  { isim: "Es-Selâm", arapca: "السَّلاَمُ", anlam: "Kullarını her türlü tehlikelerden selamete çıkaran.", zikir: 131, fazilet: "Huzur, esenlik ve hastalıklardan şifa için zikredilir." },
  { isim: "El-Mü'min", arapca: "الْمُؤْمِنُ", anlam: "Gönüllerde iman ışığını yakan, emniyet veren.", zikir: 136, fazilet: "Korkulardan emin olmak ve sığınmak için okunur." },
  { isim: "El-Müheymin", arapca: "الْمُهَيْمِنُ", anlam: "Her şeyi gözeten, koruyan ve hükmü altına alan.", zikir: 145, fazilet: "Unutkanlıktan korunmak ve muhafaza için zikredilir." },
  { isim: "El-Azîz", arapca: "الْعَزِيزُ", anlam: "İzzet sahibi, mağlup edilmesi imkânsız olan galip.", zikir: 94, fazilet: "İzzet, şeref ve zorluklara karşı durabilmek için okunur." },
  { isim: "El-Cebbâr", arapca: "الْجَبَّارُ", anlam: "Dilediğini zorla yaptıran, kırılanları onaran.", zikir: 206, fazilet: "Zalimlerin şerrinden korunmak için zikredilir." },
  { isim: "El-Mütekebbir", arapca: "الْمُتَكَبِّرُ", anlam: "Büyüklükte eşi ve benzeri olmayan, azamet sahibi.", zikir: 662, fazilet: "İtibar ve izzet kazanmak için okunur." },
  { isim: "El-Hâlık", arapca: "الْخَالِقُ", anlam: "Her şeyi yoktan var eden, yaratan yüce yaratıcı.", zikir: 731, fazilet: "İşlerin kolaylaşması ve zihin açıklığı için zikredilir." },
  { isim: "El-Bâri", arapca: "الْبَارِئُ", anlam: "Her şeyi kusursuz ve birbirine uygun yaratan.", zikir: 213, fazilet: "Başarıya ulaşmak ve sıkıntılardan kurtulmak için okunur." },
  { isim: "El-Musavvir", arapca: "الْمُصَوِّرُ", anlam: "Her şeye en güzel şekli ve sureti veren.", zikir: 336, fazilet: "Sanat ve zanaatte muvaffakiyet için okunur." },
  { isim: "El-Gaffâr", arapca: "الْغَفَّارُ", anlam: "Günahları örten, bağışlaması çok bol olan.", zikir: 1281, fazilet: "Tövbenin kabulü ve günahların affı için okunur." },
  { isim: "El-Kahhâr", arapca: "الْقَهَّارُ", anlam: "Her şeye galip gelen, kahredici güce sahip olan.", zikir: 306, fazilet: "Nefis terbiyesi ve kötü huylardan kurtulmak için zikredilir." },
  { isim: "El-Vehhâb", arapca: "الْوَهَّابُ", anlam: "Nimetleri karşılıksız, sebepsiz bolca bağışlayan.", zikir: 14, fazilet: "Rızık darlığını gidermek ve lütuf istemek için zikredilir." },
  { isim: "Er-Razzâk", arapca: "الرَّزَّاقُ", anlam: "Bütün mahlûkatın rızkını veren ve ihtiyacını karşılayan.", zikir: 308, fazilet: "Rızkın bollaşması ve bereketi için okunur." },
  { isim: "El-Fettâh", arapca: "الْفَتَّاحُ", anlam: "Her türlü müşkülü çözen, hayır kapılarını açan.", zikir: 489, fazilet: "İşlerin açılması ve başarı için zikredilir." },
  { isim: "El-Alîm", arapca: "الْعَلِيمُ", anlam: "Her şeyi en ince detayına kadar gizli ve açık bilen.", zikir: 150, fazilet: "İlim ve hikmet sahibi olmak için okunur." },
  { isim: "El-Kâbıd", arapca: "الْقَابِضُ", anlam: "Dilediğine rızkı daraltan, ruhları kabzeden.", zikir: 903, fazilet: "Zalimlerin şerrinden korunmak için zikredilir." },
  { isim: "El-Bâsıt", arapca: "الْبَاسِطُ", anlam: "Dilediğine rızkı genişleten, ruhları bağışlayan.", zikir: 72, fazilet: "Gönül ferahlığı ve rızık bereketi için okunur." },
  { isim: "El-Hâfıd", arapca: "الْخَافِضُ", anlam: "Kafir ve zalimleri alçaltan, değersiz kılan.", zikir: 1481, fazilet: "Kötülüklerden korunmak için okunur." },
  { isim: "Er-Râfi", arapca: "الرَّافِعُ", anlam: "Müminleri yükselten, mertebelerini artıran.", zikir: 351, fazilet: "Makam ve derecenin yükselmesi için zikredilir." },
  { isim: "El-Muiz", arapca: "الْمُعِزُّ", anlam: "Dilediğine izzet veren, şereflendiren.", zikir: 117, fazilet: "İnsanlar arasında hürmet görmek için okunur." },
  { isim: "El-Müzill", arapca: "الْمُذِلُّ", anlam: "Dilediğini zillete düşüren, hor ve hakir eden.", zikir: 770, fazilet: "Düşmanların şerrinden emin olmak için okunur." },
  { isim: "Es-Semî", arapca: "السَّمِيعُ", anlam: "Her sesi, gizli ve açık her duayı işiten.", zikir: 180, fazilet: "Duaların kabul olması için zikredilir." },
  { isim: "El-Basîr", arapca: "الْبَصِيرُ", anlam: "Her şeyi, gizli açık her ameli gören.", zikir: 302, fazilet: "Basiret ve göz aydınlığı için okunur." },
  { isim: "El-Hakem", arapca: "الْحَكَمُ", anlam: "Mutlak hakem, hakkı batıldan ayıran.", zikir: 68, fazilet: "Haklı davalarda başarı ve adalet için zikredilir." },
  { isim: "El-Adl", arapca: "الْعَدْلُ", anlam: "Mutlak adalet sahibi, hiç kimseye zulmetmeyen.", zikir: 104, fazilet: "Adaletli olmak ve hakkaniyet için okunur." },
  { isim: "El-Latîf", arapca: "اللَّطِيفُ", anlam: "Lütuf ve keremi bol olan, en ince işleri bilen.", zikir: 129, fazilet: "Dileklerin kabulü ve ferahlık için çokça okunur." },
  { isim: "El-Habîr", arapca: "الْخَبِيرُ", anlam: "Her şeyin iç yüzünden ve gizlisinden haberdar olan.", zikir: 812, fazilet: "Hafıza ve sezgilerin güçlenmesi için okunur." },
  { isim: "El-Halîm", arapca: "الْحَلِيمُ", anlam: "Cezada acele etmeyen, yumuşaklık sahibi.", zikir: 88, fazilet: "Öfkeyi yenmek ve ahlak güzelliği için zikredilir." },
  { isim: "El-Azîm", arapca: "الْعَظِيمُ", anlam: "Büyüklük ve azametine sınır olmayan.", zikir: 1020, fazilet: "Şifa ve heybet kazanmak için okunur." },
  { isim: "El-Gafûr", arapca: "الْغَفُورُ", anlam: "Affı ve bağışlaması son derece çok olan.", zikir: 1286, fazilet: "Magfiret ve günahların silinmesi için zikredilir." },
  { isim: "Eş-Şekûr", arapca: "الشَّكُورُ", anlam: "Az amele çok mükafat veren, şükürleri kabul eden.", zikir: 526, fazilet: "Nimetlerin artması ve şükür için okunur." },
  { isim: "El-Aliyy", arapca: "الْعَلِيُّ", anlam: "Yücelikte eşi benzeri olmayan, pek yüce.", zikir: 110, fazilet: "Zihin açıklığı ve mertebe için okunur." },
  { isim: "El-Kebîr", arapca: "الْكَبِيرُ", anlam: "Büyüklüğü akıllara sığmayan, pek büyük.", zikir: 232, fazilet: "Heybet ve saygınlık için zikredilir." },
  { isim: "El-Hafîz", arapca: "الْحَفِيظُ", anlam: "Her şeyi koruyan ve muhafaza eden.", zikir: 998, fazilet: "Tehlikelerden ve kazalardan korunmak için okunur." },
  { isim: "El-Mukît", arapca: "الْمُقِيتُ", anlam: "Her canlının gıdasını ve rızkını veren.", zikir: 550, fazilet: "Rızık bolluğu ve muhtaç olmamak için okunur." },
  { isim: "El-Hasîb", arapca: "الْحَسِيبُ", anlam: "Kullarının hesabını en iyi gören ve yeten.", zikir: 80, fazilet: "Korkulardan emin olmak için zikredilir." },
  { isim: "El-Celîl", arapca: "الْجَلِيلُ", anlam: "Celal ve azamet sahibi olan.", zikir: 73, fazilet: "Zalimlere karşı üstünlük için okunur." },
  { isim: "El-Kerîm", arapca: "الْكَرِيمُ", anlam: "İkramı ve lütfu bol olan, cömert.", zikir: 270, fazilet: "Cömertlik ve bolluk için zikredilir." },
  { isim: "Er-Rakîb", arapca: "الرَّقِيبُ", anlam: "Her an her şeyi gözeten ve denetleyen.", zikir: 312, fazilet: "Emanetlerin korunması için okunur." },
  { isim: "El-Mücîb", arapca: "الْمُجِيبُ", anlam: "Duaları kabul eden, icabet eden.", zikir: 55, fazilet: "Duaların kabul olması için okunur." },
  { isim: "El-Vâsi", arapca: "الْوَاسِعُ", anlam: "Rahmet ve ilmi her şeyi kuşatan.", zikir: 137, fazilet: "Rızık ve imkan genişliği için zikredilir." },
  { isim: "El-Hakîm", arapca: "الْحَكِيمُ", anlam: "Her işi hikmetli olan ve hikmetle yapan.", zikir: 78, fazilet: "Hikmet sahibi olmak için okunur." },
  { isim: "El-Vedûd", arapca: "الْوَدُودُ", anlam: "Kullarını çok seven ve sevilmeye layık olan.", zikir: 20, fazilet: "Sevgi ve muhabbet kazanmak için okunur." },
  { isim: "El-Mecîd", arapca: "الْمَجِيدُ", anlam: "Şanı ve şerefi çok yüce olan.", zikir: 57, fazilet: "İzzet ve şeref kazanmak için zikredilir." },
  { isim: "El-Bâis", arapca: "الْبَاعِثُ", anlam: "Ölüleri dirilten, peygamberler gönderen.", zikir: 573, fazilet: "Gönül uyanıklığı ve iman gücü için okunur." },
  { isim: "Eş-Şehîd", arapca: "الشَّهِيدُ", anlam: "Her zaman ve her yerde hazır ve nazır olan.", zikir: 319, fazilet: "İtaat ve güzel ahlak için zikredilir." },
  { isim: "El-Hakk", arapca: "الْحَقُّ", anlam: "Varlığı hiç değişmeyen, mutlak gerçek.", zikir: 108, fazilet: "Batıldan korunmak ve hakka ulaşmak için okunur." },
  { isim: "El-Vekîl", arapca: "الْوَكِيلُ", anlam: "Tevekkül edenlerin işlerini en iyi gören.", zikir: 66, fazilet: "Allah'a teslimiyet ve yardım için okunur." },
  { isim: "El-Kaviyy", arapca: "الْقَوِيُّ", anlam: "Kudreti sonsuz, pek güçlü olan.", zikir: 116, fazilet: "Beden ve ruh kuvveti için zikredilir." },
  { isim: "El-Metîn", arapca: "الْمَتِينُ", anlam: "Kuvveti sarsılmaz, son derece sağlam.", zikir: 500, fazilet: "Manevi dayanıklılık için okunur." },
  { isim: "El-Veliyy", arapca: "الْوَلِيُّ", anlam: "Müminlerin dostu ve yardımcısı olan.", zikir: 46, fazilet: "Allah'ın dostluğuna ermek için okunur." },
  { isim: "El-Hamîd", arapca: "الْحَمِيدُ", anlam: "Her türlü övgüye ve hamde layık olan.", zikir: 62, fazilet: "Güzel ahlak ve hamd için zikredilir." },
  { isim: "El-Muhsî", arapca: "الْمُحْصِي", anlam: "Yaratılan her şeyin sayısını teker teker bilen.", zikir: 148, fazilet: "Zihin açıklığı ve kavrayış için okunur." },
  { isim: "El-Mübdi", arapca: "الْمُبْدِئُ", anlam: "Maddesiz ve örneksiz olarak ilk defa yaratan.", zikir: 56, fazilet: "Yeni işlerde başarı için okunur." },
  { isim: "El-Muîd", arapca: "الْمُعِيدُ", anlam: "Yaratılmışları yok ettikten sonra tekrar dirilten.", zikir: 124, fazilet: "Kayıpların bulunması ve ferahlık için zikredilir." },
  { isim: "El-Muhyî", arapca: "الْمُحْيِي", anlam: "Can veren, hayat bağışlayan.", zikir: 68, fazilet: "Şifa ve ruhi canlanma için okunur." },
  { isim: "El-Mümît", arapca: "الْمُمِيتُ", anlam: "Canlıların hayatına son veren, öldüren.", zikir: 490, fazilet: "Nefsi yenmek ve haramdan kaçınmak için okunur." },
  { isim: "El-Hayy", arapca: "الْحَيُّ", anlam: "Ebedi hayat sahibi, daima diri olan.", zikir: 18, fazilet: "Uzun ve hayırlı ömür için zikredilir." },
  { isim: "El-Kayyûm", arapca: "الْقَيُّومُ", anlam: "Gökleri ve yeri ayakta tutan, varlığı kendinden olan.", zikir: 156, fazilet: "İşlerin intizamı ve dirlik için okunur." },
  { isim: "El-Vâcid", arapca: "الْوَاجِدُ", anlam: "İstediğini istediği an bulan, hiçbir şeye muhtaç olmayan.", zikir: 14, fazilet: "Kayıp şeyleri bulmak için okunur." },
  { isim: "El-Mâcid", arapca: "الْمَاجِدُ", anlam: "Kadr ve şanı büyük, keremi bol olan.", zikir: 48, fazilet: "Nimet ve cömertlik için zikredilir." },
  { isim: "El-Vâhid", arapca: "الْوَاحِدُ", anlam: "Zatında, sıfatlarında ve fiillerinde tek olan.", zikir: 19, fazilet: "Kalbin yalnız Allah'a bağlanması için okunur." },
  { isim: "Es-Samed", arapca: "الصَّمَدُ", anlam: "Her şeyin kendisine muhtaç olduğu, kendisi hiçbir şeye muhtaç olmayan.", zikir: 134, fazilet: "Kimseye muhtaç olmamak için zikredilir." },
  { isim: "El-Kâdir", arapca: "الْقَادِرُ", anlam: "İstediğini istediği gibi yapmaya gücü yeten.", zikir: 305, fazilet: "Dileklerin gerçekleşmesi için okunur." },
  { isim: "El-Muktedir", arapca: "الْمُقْتَدِرُ", anlam: "Kudret sahibi, kuvveti her şeye yeten.", zikir: 744, fazilet: "İşlerde kolaylık için zikredilir." },
  { isim: "El-Mukaddim", arapca: "الْمُقَدِّمُ", anlam: "Dilediğini öne alan, ileri geçiren.", zikir: 184, fazilet: "Başarıda öne geçmek için okunur." },
  { isim: "El-Muahhir", arapca: "الْمُؤَخِّرُ", anlam: "Dilediğini geride bırakan, erteleyen.", zikir: 847, fazilet: "Kötülükleri uzaklaştırmak için okunur." },
  { isim: "El-Evvel", arapca: "الأَوَّلُ", anlam: "Başlangıcı olmayan, her şeyden önce var olan.", zikir: 37, fazilet: "Hayırlı işlerin başı için zikredilir." },
  { isim: "El-Âhir", arapca: "الأَخِرُ", anlam: "Sonu olmayan, her şey yok olduktan sonra baki kalan.", zikir: 801, fazilet: "Ömrün sonunun hayırlı olması için okunur." },
  { isim: "Ez-Zâhir", arapca: "الظَّاهِرُ", anlam: "Varlığı aşikar olan, eserleriyle görünen.", zikir: 1106, fazilet: "Gönül gözünün açılması için okunur." },
  { isim: "El-Bâtın", arapca: "الْبَاطِنُ", anlam: "Gizli olan, mahiyeti akıllarla kavranamayan.", zikir: 62, fazilet: "Kalp huzuru ve sırra ermek için zikredilir." },
  { isim: "El-Vâlî", arapca: "الْوَالِي", anlam: "Bütün kâinatı idare eden, yöneten.", zikir: 47, fazilet: "Afetlerden korunmak için okunur." },
  { isim: "El-Müteâlî", arapca: "الْمُتَعَالِي", anlam: "Yücelikte en üstün olan, noksanlıktan yüce.", zikir: 541, fazilet: "Manevi derecelerin artması için zikredilir." },
  { isim: "El-Berr", arapca: "الْبَرُّ", anlam: "Kullarına iyiliği ve ihsanı bol olan.", zikir: 202, fazilet: "İyilik ve bereket bulmak için okunur." },
  { isim: "Et-Tevvâb", arapca: "التَّوَّابُ", anlam: "Tövbeleri kabul eden, günahları bağışlayan.", zikir: 409, fazilet: "Tövbenin kabulü için zikredilir." },
  { isim: "El-Müntekım", arapca: "الْمُنْتَقِمُ", anlam: "Zalimlerden intikam alan, adaletle cezalandıran.", zikir: 630, fazilet: "Zulümden korunmak için okunur." },
  { isim: "El-Afüvv", arapca: "الْعَفُوُّ", anlam: "Affı çok olan, günahları hiç yokmuş gibi silen.", zikir: 156, fazilet: "Gönül rahatlığı ve af için zikredilir." },
  { isim: "Er-Raûf", arapca: "الرَّؤُوفُ", anlam: "Çok şefkatli, merhameti bol olan.", zikir: 286, fazilet: "Merhamet ve şefkat bulmak için okunur." },
  { isim: "Mâlikü'l-Mülk", arapca: "مَالِكُ الْمُلْكِ", anlam: "Mülkün tek ve ebedi sahibi.", zikir: 212, fazilet: "Fakirlikten kurtulmak ve itibar için okunur." },
  { isim: "Zü'l-Celâli ve'l-İkrâm", arapca: "ذُو الْجَلاَلِ وَالإِكْرَامِ", anlam: "Hem azamet hem de kerem sahibi olan.", zikir: 1100, fazilet: "İşlerin rast gitmesi ve hürmet için okunur." },
  { isim: "El-Muksıt", arapca: "الْمُقْسِطُ", anlam: "Adaletle hükmeden, mazlumun hakkını alan.", zikir: 209, fazilet: "Adalet ve dirlik için zikredilir." },
  { isim: "El-Câmi", arapca: "الْجَامِعُ", anlam: "İstediğini istediği zaman toplayan.", zikir: 114, fazilet: "Küslerin barışması ve birleşmek için okunur." },
  { isim: "El-Ganiyy", arapca: "الْغَنِيُّ", anlam: "Zenginliği sonsuz, hiçbir şeye ihtiyacı olmayan.", zikir: 1060, fazilet: "Gönül ve mal zenginliği için okunur." },
  { isim: "El-Mugnî", arapca: "الْمُغْنِي", anlam: "Dilediğini zengin eden, ihtiyacını karşılayan.", zikir: 1100, fazilet: "Geçim kolaylığı için zikredilir." },
  { isim: "El-Mâni", arapca: "الْمَانِعُ", anlam: "Dilediği şeyin gerçekleşmesine engel olan.", zikir: 161, fazilet: "Kötülük ve kaza engeli için okunur." },
  { isim: "Ed-Dârr", arapca: "الضَّارُّ", anlam: "Elem ve zarar verici şeyleri yaratan.", zikir: 1001, fazilet: "Zararlı şeylerden korunmak için okunur." },
  { isim: "En-Nâfi", arapca: "النَّافِعُ", anlam: "Faydalı şeyleri yaratan, menfaat sağlayan.", zikir: 201, fazilet: "Sağlık ve faydalı işler için zikredilir." },
  { isim: "En-Nûr", arapca: "النُّورُ", anlam: "Âlemleri nurlandıran, yol gösteren.", zikir: 256, fazilet: "Gönül nurlanması ve idrak için okunur." },
  { isim: "El-Hâdî", arapca: "الْهَادِي", anlam: "Hidayet veren, doğru yolu gösteren.", zikir: 20, fazilet: "Doğru yoldan ayrılmamak için okunur." },
  { isim: "El-Bedî", arapca: "الْبَدِيعُ", anlam: "Örneksiz, eşsiz ve harika şeyler yaratan.", zikir: 86, fazilet: "Sanat ve işlerde özgünlük için zikredilir." },
  { isim: "El-Bâkı", arapca: "الْبَاقِي", anlam: "Varlığının sonu olmayan, ebedi olan.", zikir: 113, fazilet: "Ömrün bereketli ve baki kalması için okunur." },
  { isim: "El-Vâris", arapca: "الْوَارِثُ", anlam: "Her şeyin asıl sahibi ve tek varisi.", zikir: 707, fazilet: "Uzun ömür ve hayırlı nesil için okunur." },
  { isim: "Er-Reşîd", arapca: "الرَّشِيدُ", anlam: "Doğru yolu gösteren, işleri dosdoğru yöneten.", zikir: 514, fazilet: "Kötü huylardan vazgeçmek için zikredilir." },
  { isim: "Es-Sabûr", arapca: "الصَّبُورُ", anlam: "Çok sabırlı olan, cezalandırmada acele etmeyen.", zikir: 298, fazilet: "Sabır ve güç kazanmak için okunur." }
];

// Türkiye'nin 81 İli
const TURKIYE_ILLERI = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kırıkkale", "Kırklareli", "Kırşehir", "Kilis", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Şanlıurfa", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"
];

const AYLAR_TR = {
  1: "Muharrem", 2: "Safer", 3: "Rebiülevvel", 4: "Rebiülahir",
  5: "Cemaziyelevvel", 6: "Cemaziyelahir", 7: "Recep", 8: "Şaban",
  9: "Ramazan", 10: "Şevval", 11: "Zilkade", 12: "Zilhicce"
};

// DİNİ GÜNLERİN HİCRİ ŞABLON TANIMLARI (Kodda HİÇBİR sabit Miladi tarih YOKTUR; Aladhan API'den CANLI çekilir)
const DINI_GUNLER_HICRI_SABLONLARI = [
  {
    key: 'ucAylar',
    ad: 'Üç Ayların Başlangıcı',
    kategori: 'ozel_gun',
    ikon: '✨',
    hicriGun: 1,
    hicriAy: 7, // Recep
    hicriAyAdi: 'Recep',
    anlam: 'Recep, Şaban ve Ramazan aylarının kapısını açan mübarek zaman dilimi ve manevi tazelenme mevsimi.',
    ibadetler: ['Oruç tutmak', 'Tövbe istiğfar etmek', 'Üç aylar duasını okumak', 'Kuran tilaveti yapmak'],
    zikirler: "Allahümme barik lena fi Recebe ve Şa'ban ve belliğna Ramazan",
    ayetHadis: '"Şüphesiz Allah katında ayların sayısı on ikidir." (Tevbe 36)'
  },
  {
    key: 'regaip',
    ad: 'Regaip Kandili',
    kategori: 'kandil',
    ikon: '🕯️',
    hicriGun: 4,
    hicriAy: 7, // Recep
    hicriAyAdi: 'Recep',
    anlam: 'Rahmet, bereketi ve ilahi ihsanların bolca bahşedildiği mübarek gece.',
    ibadetler: ['Kaza ve nafile namaz kılmak', 'Yatsı namazını cemaatle ihya etmek', 'İstiğfar etmek'],
    zikirler: 'Sübhanallahi ve bihamdihi, Estağfirullah el-Azim',
    ayetHadis: '"Rabbinize tazarrula ve gizlice dua edin." (A\'râf 55)'
  },
  {
    key: 'mirac',
    ad: 'Miraç Kandili',
    kategori: 'kandil',
    ikon: '🌌',
    hicriGun: 27,
    hicriAy: 7, // Recep
    hicriAyAdi: 'Recep',
    anlam: 'Peygamber Efendimiz (S.A.V.)’in Mescid-i Aksa’dan ilahi huzura yükseldiği ve 5 vakit namazın farz kılındığı gece.',
    ibadetler: ['Beş vakit namazı huşu ile eda etmek', 'Amenerrasulü okumak', 'Salavat getirmek'],
    zikirler: 'La havle vela kuvvete illa billah, Sübhanallah',
    ayetHadis: '"Kulunu bir gece Mescid-i Haram\'dan Mescid-i Aksa\'ya götüren Allah noksan sıfatlardan uzaktır." (İsrâ 1)'
  },
  {
    key: 'berat',
    ad: 'Berat Kandili',
    kategori: 'kandil',
    ikon: '🕊️',
    hicriGun: 15,
    hicriAy: 8, // Şaban
    hicriAyAdi: 'Şaban',
    anlam: 'Günahlardan arınma, af ve kulların beraat belgesini alacağı mübarek gece.',
    ibadetler: ['Berat namazı kılmak', 'Gündüz oruçlu olmak', 'Duhan Suresi okumak'],
    zikirler: 'Ya Hayyu Ya Kayyum, Estağfirullah',
    ayetHadis: '"Şüphesiz biz onu mübarek bir gecede indirdik." (Duhân 3)'
  },
  {
    key: 'ramazan',
    ad: 'Ramazan-ı Şerif Başlangıcı',
    kategori: 'ozel_gun',
    ikon: '🌙',
    hicriGun: 1,
    hicriAy: 9, // Ramazan
    hicriAyAdi: 'Ramazan',
    anlam: 'On bir ayın sultanı, rahmet ve Kur’an ayı Ramazan-ı Şerif’in ilk günü.',
    ibadetler: ['Oruç tutmak', 'Teravih namazı kılmak', 'Mukabele takip etmek', 'Zekat ve sadaka vermek'],
    zikirler: 'Allahümme inneke afüvvün tühıbbül afve fa\'fü anni',
    ayetHadis: '"Ramazan ayı, insanlara yol gösterici Kur\'an\'ın indirildiği aydır." (Bakara 185)'
  },
  {
    key: 'kadir',
    ad: 'Kadir Gecesi',
    kategori: 'kandil',
    ikon: '📖',
    hicriGun: 27,
    hicriAy: 9, // Ramazan
    hicriAyAdi: 'Ramazan',
    anlam: 'Bin aydan daha hayırlı gece, Kur’an-ı Kerim’in indirilmeye başlandığı an.',
    ibadetler: ['Kadir gecesini sabaha kadar ihya etmek', 'Tesbih namazı kılmak', 'Af duası etmek'],
    zikirler: 'Allahümme inneke afüvvün tühıbbül afve fa\'fü anni',
    ayetHadis: '"Kadir Gecesi bin aydan hayırlıdır." (Kadir 3)'
  },
  {
    key: 'ramazanArefe',
    ad: 'Ramazan Bayramı Arefesi',
    kategori: 'bayram',
    ikon: '✨',
    hicriGun: 29,
    hicriAy: 9, // Ramazan
    hicriAyAdi: 'Ramazan',
    anlam: 'Ramazan ayının son günü, bayram coşkusuna hazırlık vakti.',
    ibadetler: ['Fitre sadakası vermek', 'İstiğfar ve dualara devam etmek', 'Kabir ziyareti'],
    zikirler: 'Elhamdülillahi Rabbil Alemin',
    ayetHadis: '"Orucu tamamlayın ve sizi hidayete erdirdiği için Allah\'ı tekbir edin." (Bakara 185)'
  },
  {
    key: 'ramazanBayrami',
    ad: 'Ramazan Bayramı (1. Gün)',
    kategori: 'bayram',
    ikon: '🍬',
    hicriGun: 1,
    hicriAy: 10, // Şevval
    hicriAyAdi: 'Şevval',
    anlam: 'Tutulan oruçların sevinçle kutlandığı kucaklaşma ve şükür bayramı.',
    ibadetler: ['Bayram namazı kılmak', 'Akraba ve dost ziyaretleri', 'İkramda bulunmak'],
    zikirler: 'Allahu Ekber Allahu Ekber La ilahe illallahu vallahu ekber',
    ayetHadis: '"Müminler ancak kardeştirler." (Hucurât 10)'
  },
  {
    key: 'kurbanArefe',
    ad: 'Kurban Bayramı Arefesi',
    kategori: 'bayram',
    ikon: '🏔️',
    hicriGun: 9,
    hicriAy: 12, // Zilhicce
    hicriAyAdi: 'Zilhicce',
    anlam: 'Hacıların Arafat’ta duaya durduğu, Teşrik Tekbirlerinin başladığı ulu gün.',
    ibadetler: ['Teşrik tekbirleri getirmek', 'Arefe günü orucu tutmak', '1000 İhlas okumak'],
    zikirler: 'Allahu Ekber Allahu Ekber La ilahe illallahu vallahu ekber',
    ayetHadis: '"Duaların en hayırlısı Arefe günü yapılan duadır." (Hadis-i Şerif - Tirmizî)'
  },
  {
    key: 'kurbanBayrami',
    ad: 'Kurban Bayramı (1. Gün)',
    kategori: 'bayram',
    ikon: '🐑',
    hicriGun: 10,
    hicriAy: 12, // Zilhicce
    hicriAyAdi: 'Zilhicce',
    anlam: 'Hz. İbrahim ve Hz. İsmail’in teslimiyeti, kurban ibadetinin eda edildiği ilk gün.',
    ibadetler: ['Kurban kesmek ve dağıtmak', 'Bayram namazı kılmak', 'Teşrik tekbirleri'],
    zikirler: 'Bismillahi Allahu Ekber',
    ayetHadis: '"Onların etleri ve kanları Allah\'a ulaşmaz, ancak takvanız ulaşır." (Hac 37)'
  },
  {
    key: 'hicriYilbasi',
    ad: 'Hicri Yılbaşı',
    kategori: 'ozel_gun',
    ikon: '🗓️',
    hicriGun: 1,
    hicriAy: 1, // Muharrem
    hicriAyAdi: 'Muharrem',
    anlam: 'Hz. Muhammed (S.A.V.)’in Mekke’den Medine’ye hicretini esas alan yeni Hicri yıl.',
    ibadetler: ['Yılın ilk gününü oruçla karşılamak', 'Yeni yıl duaları okumak'],
    zikirler: 'Hasbunallahu ve ni\'mel vekil',
    ayetHadis: '"İman edip hicret edenler Allah katında en büyük dereceye sahiptir." (Tevbe 20)'
  },
  {
    key: 'asure',
    ad: 'Aşure Günü',
    kategori: 'ozel_gun',
    ikon: '🥣',
    hicriGun: 10,
    hicriAy: 1, // Muharrem
    hicriAyAdi: 'Muharrem',
    anlam: 'Peygamberlerin felaketlerden kurtuluşa erdiği ilahi bereket günü.',
    ibadetler: ['Muharrem orucu tutmak', 'Aşure pişirip ikram etmek'],
    zikirler: 'Hasbunallahu ve ni\'mel vekil ni\'mel mevla ve ni\'men nasir',
    ayetHadis: '"Aşure günü orucu bir önceki yılın günahlarına kefarettir." (Hadis-i Şerif - Müslim)'
  },
  {
    key: 'mevlid',
    ad: 'Mevlid Kandili',
    kategori: 'kandil',
    ikon: '🕌',
    hicriGun: 12,
    hicriAy: 3, // Rebiülevvel
    hicriAyAdi: 'Rebiülevvel',
    anlam: 'Sevgili Peygamberimiz Hz. Muhammed (S.A.V.)’in doğduğu mübarek gece.',
    ibadetler: ['Salavat-ı Şerifeler okumak', 'Siyer-i Nebî okumak', 'Dualar'],
    zikirler: 'Allahümme salli ala seyyidina Muhammedin ve ala ali seyyidina Muhammed',
    ayetHadis: '"Biz seni ancak âlemlere rahmet olarak gönderdik." (Enbiyâ 107)'
  }
];

const AYLAR_ISIMLERI_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUN_ISIMLERI_TR = {
  "Monday": "Pazartesi", "Tuesday": "Salı", "Wednesday": "Çarşamba",
  "Thursday": "Perşembe", "Friday": "Cuma", "Saturday": "Cumartesi", "Sunday": "Pazar"
};

const HICRI_AY_GUNLERI = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];

const hicriYilIciGunIndex = (ay, gun) => {
  let toplam = 0;
  for (let m = 1; m < ay; m++) {
    toplam += HICRI_AY_GUNLERI[m - 1];
  }
  return toplam + gun;
};

// Dini Günlerin Kalan Gününü Bugünün Hicri Tarihine Göre Anında Hesaplayan Fonksiyon
const diniGunleriHicridenHesapla = (bugunHicriGun = 1, bugunHicriAy = 1, seciliYil = 1448) => {
  const bugunIndex = hicriYilIciGunIndex(bugunHicriAy, bugunHicriGun);

  return DINI_GUNLER_HICRI_SABLONLARI.map(sablon => {
    const gunIndex = hicriYilIciGunIndex(sablon.hicriAy, sablon.hicriGun);
    let farkGun = gunIndex - bugunIndex;

    if (farkGun < 0) {
      farkGun += 354; // Geçmiş gün gelecek Hicri yıla devreder
    }

    const hicriTarihStr = `${sablon.hicriGun} ${sablon.hicriAyAdi} ${seciliYil}`;

    return {
      ...sablon,
      id: `${sablon.key}-${seciliYil}`,
      hicriTarih: hicriTarihStr,
      miladiTarih: `${sablon.hicriGun} ${sablon.hicriAyAdi}`,
      farkGun: farkGun
    };
  });
};

export default function Maneviyat() {
  // Şehir ve Namaz Vakti State'leri
  const [sehir, setSehir] = useState(() => localStorage.getItem('maneviyat_sehir') || 'Konya');
  const [namazVakitleri, setNamazVakitleri] = useState(null);
  const [hicriTarih, setHicriTarih] = useState("Hesaplanıyor...");
  const [hicriYil, setHicriYil] = useState(1448);

  // Canlı Geri Sayım & İlerleme
  const [kalanSure, setKalanSure] = useState('--:--:--');
  const [sonrakiVakitAdi, setSonrakiVakitAdi] = useState('');
  const [vakitYuzdesi, setVakitYuzdesi] = useState(0);

  // Kılınan Namazlar & Zikir State
  const [maneviyatState, setManeviyatState] = useState({
    id: new Date().toISOString().split('T')[0],
    sabahVakti: false,
    ogleVakti: false,
    ikindiVakti: false,
    aksamVakti: false,
    yatsiVakti: false,
    secilenZikir: "Sübhanallah",
    zikirSayisi: 0,
    hedefSayi: 33,
    tefekkurNotu: ""
  });

  // 1. İNTERNETTEN CANLI ÇEKİLEN AYET-İ KERİME
  const [canliAyet, setCanliAyet] = useState({
    metin: "Şüphesiz Allah, adaleti, iyilik yapmayı, yakınlara yardım etmeyi emreder.",
    arapca: "إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالإِحْسَانِ وَإِيتَاءِ ذِي الْقُرْبَى",
    kaynak: "Nahl Suresi, 90. Ayet",
    audio: "",
    ayahNo: 2005
  });
  const [ayetYukleniyor, setAyetYukleniyor] = useState(false);
  const [sesCaliyor, setSesCaliyor] = useState(false);
  const audioRef = useRef(null);

  // 2. İNTERNETTEN CANLI ÇEKİLEN HADİS-İ ŞERİF
  const [canliHadis, setCanliHadis] = useState({
    metin: "İnsanların en hayırlısı, insanlara en faydalı olanıdır.",
    kaynak: "Hadis-i Şerif — Sahih-i Buhârî",
    konu: "Ahlak & İyilik"
  });
  const [hadisYukleniyor, setHadisYukleniyor] = useState(false);
  const [hadisHavuzu, setHadisHavuzu] = useState([]);

  // 3. İNTERNETTEN ALADHAN API İLE CANLI ÇEKİLEN DİNİ GÜNLER DİZİSİ & STATE'LER
  const [seciliHicriYil, setSeciliHicriYil] = useState(1448);
  const [diniGunlerCanli, setDiniGunlerCanli] = useState([]);
  const [diniGunlerYukleniyor, setDiniGunlerYukleniyor] = useState(false);
  const [takvimFiltre, setTakvimFiltre] = useState('tum');
  const [takvimArama, setTakvimArama] = useState('');
  const [takvimGorunum, setTakvimGorunum] = useState('grid');
  const [seciliDetayGun, setSeciliDetayGun] = useState(null);
  const [tamamlananIbadetler, setTamamlananIbadetler] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('maneviyat_ibadetler')) || {};
    } catch {
      return {};
    }
  });
  const [bildirimMesaji, setBildirimMesaji] = useState(null);

  const [bugunHicriState, setBugunHicriState] = useState({ gun: 1, ay: 1, yil: 1448 });

  const diniGunleriYukle = (hicriYil = seciliHicriYil, bGun = bugunHicriState.gun, bAy = bugunHicriState.ay) => {
    setDiniGunlerYukleniyor(true);
    const veriler = diniGunleriHicridenHesapla(bGun, bAy, hicriYil);
    setDiniGunlerCanli(veriler);
    setDiniGunlerYukleniyor(false);
  };

  useEffect(() => {
    diniGunleriYukle(seciliHicriYil, bugunHicriState.gun, bugunHicriState.ay);
  }, [seciliHicriYil, bugunHicriState]);

  const ibadetToggle = (gunId, ibadetIndex) => {
    const key = `${gunId}_${ibadetIndex}`;
    setTamamlananIbadetler(prev => {
      const yeni = { ...prev, [key]: !prev[key] };
      localStorage.setItem('maneviyat_ibadetler', JSON.stringify(yeni));
      return yeni;
    });
  };

  const bildirimGoster = (mesaj) => {
    setBildirimMesaji(mesaj);
    setTimeout(() => setBildirimMesaji(null), 3000);
  };

  // Esma-ül Hüsna İndeksi
  const [esmaIndex, setEsmaIndex] = useState(0);

  // Favoriler
  const [favoriler, setFavoriler] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('maneviyat_favoriler')) || [];
    } catch {
      return [];
    }
  });

  // Aktif Sekme
  const [aktifSekme, setAktifSekme] = useState('genel');

  const getLocalDateStr = (d) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d - tzOffset).toISOString().split('T')[0];
  };
  const bugunStr = getLocalDateStr(new Date());

  // 4. GÜNLÜK VE GEÇMİŞ NAMAZ TAKİBİ STATE'İ (TARİH BAZLI VERİTABANI)
  const [namazGecmisi, setNamazGecmisi] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('maneviyat_namaz_gecmisi')) || {};
    } catch {
      return {};
    }
  });

  const bugunNamazData = namazGecmisi[bugunStr] || {
    sabahVakti: false,
    ogleVakti: false,
    ikindiVakti: false,
    aksamVakti: false,
    yatsiVakti: false
  };

  const namazVaktiToggle = (vakitKey, tarihStr = bugunStr) => {
    setNamazGecmisi(prev => {
      const mevcutGun = prev[tarihStr] || {
        sabahVakti: false,
        ogleVakti: false,
        ikindiVakti: false,
        aksamVakti: false,
        yatsiVakti: false
      };
      const yeniGun = { ...mevcutGun, [vakitKey]: !mevcutGun[vakitKey] };
      const yeniGecmis = { ...prev, [tarihStr]: yeniGun };
      
      // 1. LocalStorage Güncelleme
      localStorage.setItem('maneviyat_namaz_gecmisi', JSON.stringify(yeniGecmis));
      localStorage.setItem(`maneviyat_state_${tarihStr}`, JSON.stringify({
        id: tarihStr,
        ...yeniGun
      }));

      // 2. Life-OS Firebase Güncellemesi
      try {
        const userId = getCurrentUserId();
        if (userId) {
          setDoc(doc(db, 'spirituality', `${userId}_${tarihStr}`), {
            userId,
            id: tarihStr,
            ...yeniGun
          }, { merge: true }).catch(() => {});
        }
      } catch (e) {}

      // Eğer bugün güncellendiyse genel maneviyatState'i de senkronize et
      if (tarihStr === bugunStr) {
        setManeviyatState(mPrev => ({
          ...mPrev,
          ...yeniGun
        }));
      }

      return yeniGecmis;
    });
  };

  // 5. TEFEKKÜR NOTLARI YÖNETİMİ STATE'LERİ (EKLE, DÜZENLE, SİL)
  const [tefekkurNotlari, setTefekkurNotlari] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('maneviyat_tefekkur_notlari')) || [
        {
          id: 'note-1',
          baslik: 'Günün Şükrü ve Tefekkürü',
          icerik: 'Verilen nimetler, sağlık ve huzur için Yüce Allah’a sonsuz şükürler olsun.',
          kategori: 'Şükür',
          tarih: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
        }
      ];
    } catch {
      return [];
    }
  });

  const [yeniNotForm, setYeniNotForm] = useState({ baslik: '', icerik: '', kategori: 'Tefekkür' });
  const [duzenlenenNotId, setDuzenlenenNotId] = useState(null);
  const [tefekkurArama, setTefekkurArama] = useState('');

  const tefekkurNotKaydet = () => {
    if (!yeniNotForm.baslik.trim() || !yeniNotForm.icerik.trim()) return;

    if (duzenlenenNotId) {
      setTefekkurNotlari(prev => {
        const yeni = prev.map(n => n.id === duzenlenenNotId ? {
          ...n,
          baslik: yeniNotForm.baslik,
          icerik: yeniNotForm.icerik,
          kategori: yeniNotForm.kategori,
          guncellenmeTarihi: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
        } : n);
        localStorage.setItem('maneviyat_tefekkur_notlari', JSON.stringify(yeni));
        return yeni;
      });
      setDuzenlenenNotId(null);
      bildirimGoster("Tefekkür notu güncellendi! ✏️");
    } else {
      const yeniNot = {
        id: `note-${Date.now()}`,
        baslik: yeniNotForm.baslik,
        icerik: yeniNotForm.icerik,
        kategori: yeniNotForm.kategori,
        tarih: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
      };
      setTefekkurNotlari(prev => {
        const yeni = [yeniNot, ...prev];
        localStorage.setItem('maneviyat_tefekkur_notlari', JSON.stringify(yeni));
        return yeni;
      });
      bildirimGoster("Yeni tefekkür notu eklendi! ✍️");
    }

    setYeniNotForm({ baslik: '', icerik: '', kategori: 'Tefekkür' });
  };

  const tefekkurNotSil = (id) => {
    setTefekkurNotlari(prev => {
      const yeni = prev.filter(n => n.id !== id);
      localStorage.setItem('maneviyat_tefekkur_notlari', JSON.stringify(yeni));
      return yeni;
    });
    bildirimGoster("Not silindi 🗑️");
  };

  const tefekkurNotDuzenleBaslat = (not) => {
    setDuzenlenenNotId(not.id);
    setYeniNotForm({ baslik: not.baslik, icerik: not.icerik, kategori: not.kategori || 'Tefekkür' });
  };

  // Şehir seçimi kaydet
  useEffect(() => {
    localStorage.setItem('maneviyat_sehir', sehir);
    window.dispatchEvent(new Event('sehirDegisti'));
  }, [sehir]);

  // Favorileri kaydet
  useEffect(() => {
    localStorage.setItem('maneviyat_favoriler', JSON.stringify(favoriler));
  }, [favoriler]);

  // Maneviyat verisi çekme
  useEffect(() => {
    const veriCek = async () => {
      try {
        const userId = getCurrentUserId();
        if (userId) {
          const snap = await getDoc(doc(db, 'spirituality', `${userId}_${bugunStr}`));
          if (snap.exists()) {
            setManeviyatState(prev => ({ ...prev, ...snap.data() }));
            return;
          }
        }
      } catch (err) {
        // Sessiz fallback
      }

      const kayitliLocal = localStorage.getItem(`maneviyat_state_${bugunStr}`);
      if (kayitliLocal) {
        try {
          setManeviyatState(JSON.parse(kayitliLocal));
        } catch (e) {
          console.error("Localstate okuma hatası", e);
        }
      }
    };
    veriCek();
  }, [bugunStr]);

  const guncelleState = async (yeniData) => {
    setManeviyatState(yeniData);
    localStorage.setItem(`maneviyat_state_${bugunStr}`, JSON.stringify(yeniData));

    try {
      const userId = getCurrentUserId();
      if (userId) {
        await setDoc(doc(db, 'spirituality', `${userId}_${bugunStr}`), {
          userId,
          id: bugunStr,
          ...yeniData
        }, { merge: true });
      }
    } catch (err) {
      // Sessiz fallback
    }
  };

  // --- İNTERNETTEN CANLI AYET ÇEKME (AlQuran API) ---
  const ayetGetir = async (hedefAyahNo = null) => {
    setAyetYukleniyor(true);
    if (sesCaliyor && audioRef.current) {
      audioRef.current.pause();
      setSesCaliyor(false);
    }

    try {
      let ayahNo = hedefAyahNo;
      if (!ayahNo) {
        ayahNo = Math.floor(Math.random() * 6236) + 1;
      }

      const resMeal = await fetch(`https://api.alquran.cloud/v1/ayah/${ayahNo}/tr.diyanet`);
      const resArapca = await fetch(`https://api.alquran.cloud/v1/ayah/${ayahNo}/ar.alafasy`);

      if (resMeal.ok && resArapca.ok) {
        const dataMeal = await resMeal.json();
        const dataArapca = await resArapca.json();

        setCanliAyet({
          metin: dataMeal.data.text,
          arapca: dataArapca.data.text,
          kaynak: `${dataMeal.data.surah.englishName} (${dataMeal.data.surah.name}) Suresi, ${dataMeal.data.numberInSurah}. Ayet`,
          audio: dataArapca.data.audio || `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${ayahNo}.mp3`,
          ayahNo: ayahNo
        });
      }
    } catch (err) {
      console.error("Ayet API çekme hatası", err);
    }
    setAyetYukleniyor(false);
  };

  // --- İNTERNETTEN CANLI HADİS ÇEKME ---
  const hadisleriInternettenCek = async () => {
    setHadisYukleniyor(true);
    try {
      const res = await fetch('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/tur-bukhari.json');
      if (res.ok) {
        const data = await res.json();
        if (data.hadiths && data.hadiths.length > 0) {
          setHadisHavuzu(data.hadiths);

          const d = new Date();
          const gunIndeks = (d.getFullYear() * 365 + d.getMonth() * 31 + d.getDate()) % data.hadiths.length;
          const secilen = data.hadiths[gunIndeks];

          setCanliHadis({
            metin: secilen.text,
            kaynak: `Sahih-i Buhârî, Hadis #${secilen.hadithnumber || gunIndeks + 1}`,
            konu: "Hadis-i Şerif"
          });
        }
      }
    } catch (err) {
      console.warn("Hadis API çekilemedi", err);
    }
    setHadisYukleniyor(false);
  };

  const rastgeleHadisGetir = () => {
    if (hadisHavuzu.length > 0) {
      setHadisYukleniyor(true);
      setTimeout(() => {
        const rastgele = hadisHavuzu[Math.floor(Math.random() * hadisHavuzu.length)];
        setCanliHadis({
          metin: rastgele.text,
          kaynak: `Sahih-i Buhârî, Hadis #${rastgele.hadithnumber}`,
          konu: "Hadis-i Şerif"
        });
        setHadisYukleniyor(false);
      }, 200);
    } else {
      hadisleriInternettenCek();
    }
  };

  // İNTERNETTEN NAMAZ VAKİTLERİ VE HİCRİ TAKVİM ÇEKME
  useEffect(() => {
    const vakitleriCek = async () => {
      try {
        const apiSehir = sehir.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, 'i').replace(/İ/g, 'I');
        const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${apiSehir}&country=Turkey&method=13`);

        if (res.ok) {
          const data = await res.json();
          setNamazVakitleri({
            sabahVakti: data.data.timings.Fajr,
            gunesVakti: data.data.timings.Sunrise,
            ogleVakti: data.data.timings.Dhuhr,
            ikindiVakti: data.data.timings.Asr,
            aksamVakti: data.data.timings.Maghrib,
            yatsiVakti: data.data.timings.Isha
          });

          const hijri = data.data.date.hijri;
          const ayNumarasi = parseInt(hijri.month.number, 10);
          const gunNumarasi = parseInt(hijri.day, 10);
          const yil = parseInt(hijri.year, 10);
          setHicriYil(yil);
          setHicriTarih(`${hijri.day} ${AYLAR_TR[ayNumarasi] || hijri.month.en} ${hijri.year}`);
          setBugunHicriState({ gun: gunNumarasi, ay: ayNumarasi, yil: yil });

          diniGunleriYukle(yil, gunNumarasi, ayNumarasi);
        }
      } catch (err) {
        console.error("Vakitler çekilemedi", err);
        setHicriTarih("İnternet Bağlantısı Aranıyor");
      }
    };
    vakitleriCek();
  }, [sehir]);

  useEffect(() => {
    const d = new Date();
    const gunAyetNo = ((d.getFullYear() * 365 + d.getMonth() * 31 + d.getDate()) % 6236) + 1;
    ayetGetir(gunAyetNo);
    hadisleriInternettenCek();
  }, []);

  // CANLI GERİ SAYIM SAYACI
  useEffect(() => {
    if (!namazVakitleri) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

      const vakitlerListesi = [
        { ad: 'Sabah', saat: namazVakitleri.sabahVakti },
        { ad: 'Öğle', saat: namazVakitleri.ogleVakti },
        { ad: 'İkindi', saat: namazVakitleri.ikindiVakti },
        { ad: 'Akşam', saat: namazVakitleri.aksamVakti },
        { ad: 'Yatsı', saat: namazVakitleri.yatsiVakti }
      ];

      let siradakiVakitIndex = -1;
      let saniyeFarki = 0;

      for (let i = 0; i < vakitlerListesi.length; i++) {
        const v = vakitlerListesi[i];
        if (!v.saat) continue;
        const [saat, dakika] = v.saat.split(':').map(Number);
        const vakitSaniyesi = saat * 3600 + dakika * 60;

        if (vakitSaniyesi > currentSeconds) {
          siradakiVakitIndex = i;
          saniyeFarki = vakitSaniyesi - currentSeconds;
          break;
        }
      }

      let siradakiVakit = '';
      let oncekiVakitSaniye = 0;
      let sonrakiVakitSaniye = 86400;

      if (siradakiVakitIndex !== -1) {
        siradakiVakit = vakitlerListesi[siradakiVakitIndex].ad;
        const [h, m] = vakitlerListesi[siradakiVakitIndex].saat.split(':').map(Number);
        sonrakiVakitSaniye = h * 3600 + m * 60;

        if (siradakiVakitIndex > 0) {
          const [oh, om] = vakitlerListesi[siradakiVakitIndex - 1].saat.split(':').map(Number);
          oncekiVakitSaniye = oh * 3600 + om * 60;
        }
      } else {
        siradakiVakit = 'Sabah (Yarın)';
        const [h, m] = vakitlerListesi[0].saat.split(':').map(Number);
        sonrakiVakitSaniye = (h + 24) * 3600 + m * 60;
        const [yh, ym] = vakitlerListesi[vakitlerListesi.length - 1].saat.split(':').map(Number);
        oncekiVakitSaniye = yh * 3600 + ym * 60;
        saniyeFarki = sonrakiVakitSaniye - currentSeconds;
      }

      const toplamAralik = Math.max(1, sonrakiVakitSaniye - oncekiVakitSaniye);
      const gecenAralik = Math.max(0, currentSeconds - oncekiVakitSaniye);
      const yuzde = Math.min(100, Math.max(0, Math.round((gecenAralik / toplamAralik) * 100)));
      setVakitYuzdesi(yuzde);

      const hour = Math.floor(saniyeFarki / 3600).toString().padStart(2, '0');
      const min = Math.floor((saniyeFarki % 3600) / 60).toString().padStart(2, '0');
      const sec = (saniyeFarki % 60).toString().padStart(2, '0');

      setKalanSure(`${hour}:${min}:${sec}`);
      setSonrakiVakitAdi(siradakiVakit);

    }, 1000);

    return () => clearInterval(interval);
  }, [namazVakitleri]);

  const sesCalTogglle = () => {
    if (!canliAyet.audio) return;

    if (sesCaliyor && audioRef.current) {
      audioRef.current.pause();
      setSesCaliyor(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(canliAyet.audio);
        audioRef.current.onended = () => setSesCaliyor(false);
      } else {
        audioRef.current.src = canliAyet.audio;
      }

      audioRef.current.play()
        .then(() => setSesCaliyor(true))
        .catch(err => {
          console.error("Ses oynatılamadı", err);
          setSesCaliyor(false);
        });
    }
  };

  const favoriToggle = (oge, tur) => {
    const varMi = favoriler.some(f => f.metin === oge.metin);
    if (varMi) {
      setFavoriler(favoriler.filter(f => f.metin !== oge.metin));
    } else {
      setFavoriler([...favoriler, { ...oge, tur, tarih: new Date().toLocaleDateString('tr-TR') }]);
    }
  };

  const zikirSifirla = () => guncelleState({ ...maneviyatState, zikirSayisi: 0 });
  const zikirArtir = () => guncelleState({ ...maneviyatState, zikirSayisi: maneviyatState.zikirSayisi + 1 });

  const suAnkiEsma = ESMA_UL_HUSNA[esmaIndex];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">

      {/* 1. ÜST HERO BAŞLIK */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 text-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-emerald-500/20 backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                ☪ Maneviyat & İbadet Merkezi
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif tracking-tight font-normal text-amber-100">
              Huzur ve Tefekkür Köşesi
            </h1>
            <p className="text-slate-300 text-sm md:text-base font-light max-w-xl">
              Canlı vakit takibi, internet mealli ayet ve hadisler, zikirmatik ve tefekkür günlüğün.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15 text-center sm:text-right shadow-inner flex-1">
              <span className="text-[10px] text-amber-300 font-bold uppercase tracking-widest block mb-0.5">
                HİCRİ TARİH
              </span>
              <p className="text-base sm:text-lg font-serif font-semibold text-white">
                {hicriTarih}
              </p>
            </div>

            <select
              value={sehir}
              onChange={e => setSehir(e.target.value)}
              className="maneviyat-hero-select text-xs font-semibold rounded-2xl px-4 py-3.5 outline-none cursor-pointer hover:bg-white/20 transition shadow-sm"
            >
              {TURKIYE_ILLERI.map(il => (
                <option key={il} value={il} className="bg-slate-900 text-white">📍 {il}</option>
              ))}
            </select>
          </div>
        </div>

        {/* SEKME BUTONLARI */}
        <div className="relative z-10 flex flex-wrap gap-2 mt-8 pt-6 border-t border-white/10">
          {[
            { id: 'genel', etiket: 'Ana Sayfa', ikon: '✦' },
            { id: 'tefekkur', etiket: 'Tefekkür Notları', ikon: '✎' },
            { id: 'takvim', etiket: 'Dini Günler & Takvim', ikon: '☪' },
            { id: 'favoriler', etiket: `Favorilerim (${favoriler.length})`, ikon: '★' }
          ].map(sekme => (
            <button
              key={sekme.id}
              onClick={() => setAktifSekme(sekme.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${aktifSekme === sekme.id ? 'bg-amber-400 text-slate-950 font-bold shadow-md scale-105' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              <span>{sekme.ikon}</span>
              <span>{sekme.etiket}</span>
            </button>
          ))}
        </div>
      </div>

      {/* --- 2. ANA SEKMELER İÇERİĞİ --- */}

      {aktifSekme === 'genel' && (
        <div className="space-y-8">

          {/* İNTERNETTEN ÇEKİLEN CANLI AYET KARTI */}
          <div className="maneviyat-card bg-white/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] border border-black/5 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                  📖
                </span>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    Günün Ayet-i Kerimesi
                  </h3>
                  <p className="text-[11px] text-gray-400">Canlı Diyanet Meali & Alafasy Tilaveti</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {canliAyet.audio && (
                  <button
                    onClick={sesCalTogglle}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${sesCaliyor ? 'bg-amber-500 text-white border-amber-600 animate-pulse' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
                    title="Ayetin sesli tilavetini dinle"
                  >
                    <span>{sesCaliyor ? '⏸️' : '🔊'}</span>
                    <span>{sesCaliyor ? 'Duraklat' : 'Dinle'}</span>
                  </button>
                )}

                <button
                  onClick={() => favoriToggle(canliAyet, 'ayet')}
                  className={`p-2 rounded-full text-xs transition cursor-pointer border ${favoriler.some(f => f.metin === canliAyet.metin) ? 'bg-amber-100 text-amber-600 border-amber-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border-transparent'}`}
                  title="Favorilerime ekle"
                >
                  ★
                </button>

                <button
                  onClick={() => ayetGetir()}
                  disabled={ayetYukleniyor}
                  className={`p-2 rounded-full text-gray-500 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer ${ayetYukleniyor ? 'animate-spin' : ''}`}
                  title="İnternetten Yeni Ayet Çek"
                >
                  🔄
                </button>
              </div>
            </div>

            {canliAyet.arapca && (
              <div className="text-right font-serif text-xl sm:text-2xl text-emerald-800 dark:text-emerald-300 leading-loose mb-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                {canliAyet.arapca}
              </div>
            )}

            <blockquote className="text-gray-800 font-serif italic text-base sm:text-lg leading-relaxed mb-4 border-l-4 border-amber-400 pl-4 py-1">
              {ayetYukleniyor ? "İnternetten yeni ayet çekiliyor..." : `"${canliAyet.metin}"`}
            </blockquote>

            <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-black/5">
              <span className="font-semibold text-amber-700">{canliAyet.kaynak}</span>
              <span className="text-[11px] text-gray-400">🌐 İnternet API Bağlantısı</span>
            </div>
          </div>

          {/* İKİLİ IZGARA: İNTERNET HADİSİ VE NAMAZ VAKİTLERİ TIMELINE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* CANLI HADİS KARTI */}
            <div className="maneviyat-card bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-black/5 shadow-sm flex flex-col justify-between relative">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="badge-amber text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    ✨ Günün Hadis-i Şerifi
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => favoriToggle(canliHadis, 'hadis')}
                      className={`p-1.5 rounded-full text-xs transition cursor-pointer ${favoriler.some(f => f.metin === canliHadis.metin) ? 'bg-amber-100 text-amber-600' : 'text-gray-400 hover:text-amber-600'}`}
                      title="Favorilerime Ekle"
                    >
                      ★
                    </button>
                    <button
                      onClick={rastgeleHadisGetir}
                      disabled={hadisYukleniyor}
                      className={`p-1.5 text-gray-400 hover:text-amber-600 transition cursor-pointer ${hadisYukleniyor ? 'animate-spin' : ''}`}
                      title="İnternetten Yeni Hadis Çek"
                    >
                      🔄
                    </button>
                  </div>
                </div>

                <p className="text-gray-800 text-sm sm:text-base font-serif italic leading-relaxed mb-4">
                  {hadisYukleniyor ? "İnternetten Hadis-i Şerif çekiliyor..." : `"${canliHadis.metin}"`}
                </p>
              </div>

              <div className="pt-3 border-t border-black/5 flex justify-between items-center text-xs">
                <span className="badge-emerald px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                  🌐 İnternet API (Sahih-i Buhârî)
                </span>
                <span className="text-gray-500 font-semibold">{canliHadis.kaynak}</span>
              </div>
            </div>

            {/* DİNAMİK NAMAZ VAKİTLERİ TIMELINE */}
            <div className="maneviyat-card bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-black/5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="text-base font-bold text-gray-900">Namaz Vakitleri & Takip</h4>
                    <p className="text-xs text-gray-400">Eda ettiğin vakitleri işaretle</p>
                  </div>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    📍 {sehir}
                  </span>
                </div>

                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 mb-4 shadow-sm border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-300 font-medium">
                      Sonraki Vakit: <strong className="text-emerald-400 font-semibold">{sonrakiVakitAdi}</strong>
                    </span>
                    <span className="text-sm font-mono font-bold text-amber-300 tracking-wider">
                      {kalanSure}
                    </span>
                  </div>

                  <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${vakitYuzdesi}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 text-center">
                  {[
                    { key: 'sabahVakti', ad: 'Sabah' },
                    { key: 'ogleVakti', ad: 'Öğle' },
                    { key: 'ikindiVakti', ad: 'İkindi' },
                    { key: 'aksamVakti', ad: 'Akşam' },
                    { key: 'yatsiVakti', ad: 'Yatsı' }
                  ].map(vakit => {
                    const tamamlandi = bugunNamazData[vakit.key];
                    const saat = namazVakitleri ? namazVakitleri[vakit.key] : '--:--';
                    const isNext = sonrakiVakitAdi.includes(vakit.ad);

                    return (
                      <button
                        key={vakit.key}
                        onClick={() => namazVaktiToggle(vakit.key)}
                        className={`py-3 px-1 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-1 relative overflow-hidden ${tamamlandi ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : isNext ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-gray-50 text-gray-700 border-black/5 hover:bg-white'}`}
                      >
                        <span className={`text-[10px] font-bold ${tamamlandi ? 'text-emerald-100' : 'text-gray-400'}`}>
                          {saat}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-tight">{vakit.ad}</span>
                        <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center mt-1 font-bold ${tamamlandi ? 'bg-white/20 text-white' : 'bg-black/5 text-gray-400'}`}>
                          {tamamlandi ? '✓' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* ÜÇLÜ IZGARA: ZİKİRMATİK, ESMA-ÜL HÜSNA (ÖNCEKİ & SONRAKİ BUTONLU), NAMAZ GEÇMİŞİ ÖZETİ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* ZİKİRMATİK */}
            <div className="maneviyat-card bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-black/5 shadow-sm flex flex-col items-center text-center justify-between">
              <div className="w-full">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Zikirmatik</h3>
                  <select
                    value={maneviyatState.hedefSayi}
                    onChange={(e) => guncelleState({ ...maneviyatState, hedefSayi: Number(e.target.value) })}
                    className="text-xs bg-gray-50 border border-black/10 rounded-lg px-2 py-1 outline-none text-gray-600 font-medium cursor-pointer"
                  >
                    <option value={33}>Hedef: 33</option>
                    <option value={99}>Hedef: 99</option>
                    <option value={100}>Hedef: 100</option>
                    <option value={1000}>Hedef: 1000</option>
                  </select>
                </div>

                <select
                  value={maneviyatState.secilenZikir}
                  onChange={(e) => guncelleState({ ...maneviyatState, secilenZikir: e.target.value })}
                  className="w-full mb-4 px-3 py-2 bg-emerald-50/50 border border-emerald-200/60 rounded-xl text-xs font-semibold text-emerald-800 outline-none cursor-pointer text-center"
                >
                  <option value="Sübhanallah">Sübhanallah</option>
                  <option value="Elhamdülillah">Elhamdülillah</option>
                  <option value="Allahu Ekber">Allahu Ekber</option>
                  <option value="La ilahe illallah">La ilahe illallah</option>
                  <option value="Estağfirullah">Estağfirullah</option>
                  <option value="Sübhanallahi ve bi-hamdihi">Sübhanallahi ve bi-hamdihi</option>
                  <option value="Ya Hayyu Ya Kayyum">Ya Hayyu Ya Kayyum</option>
                  <option value="La havle vela kuvvete illa billah">La havle vela kuvvete illa billah</option>
                </select>
              </div>

              <div className="relative my-2">
                <svg className="w-36 h-36 transform -rotate-90">
                  <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="8" className="text-gray-100 dark:text-slate-700" fill="transparent" />
                  <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="8" className="text-emerald-500 transition-all duration-300" fill="transparent" strokeDasharray={377} strokeDashoffset={377 - (377 * Math.min(maneviyatState.zikirSayisi, maneviyatState.hedefSayi)) / maneviyatState.hedefSayi} strokeLinecap="round" />
                </svg>

                <button
                  onClick={zikirArtir}
                  className="absolute inset-2 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all border-4 border-white dark:border-slate-800"
                >
                  <span className="text-4xl font-bold font-serif">{maneviyatState.zikirSayisi}</span>
                  <span className="text-[9px] uppercase tracking-widest text-emerald-100 mt-0.5">Dokun</span>
                </button>
              </div>

              <div className="w-full flex justify-between items-center text-xs text-gray-400 mt-2">
                <span>Hedef: {maneviyatState.hedefSayi}</span>
                <button onClick={zikirSifirla} className="text-red-500 hover:text-red-600 transition font-medium cursor-pointer">
                  Sıfırla ↺
                </button>
              </div>
            </div>

            {/* ESMA-ÜL HÜSNA (DİĞER KARTLARLA BİREBİR AYNI BEYAZ KART STİLİ) */}
            <div className="maneviyat-card bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-black/5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    Esma-ül Hüsna ({esmaIndex + 1}/99)
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEsmaIndex((esmaIndex - 1 + ESMA_UL_HUSNA.length) % ESMA_UL_HUSNA.length)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm border border-slate-200 transition cursor-pointer"
                      title="Önceki"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setEsmaIndex((esmaIndex + 1) % ESMA_UL_HUSNA.length)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm border border-slate-200 transition cursor-pointer"
                      title="Sonraki"
                    >
                      →
                    </button>
                  </div>
                </div>

                <div className="text-center py-2">
                  <span className="text-3xl font-serif font-bold text-teal-800 block mb-1">
                    {suAnkiEsma.arapca}
                  </span>
                  <h4 className="text-lg font-serif font-bold text-gray-900 mb-1">
                    {suAnkiEsma.isim}
                  </h4>
                  <p className="text-xs text-gray-600 font-light leading-relaxed mb-3">
                    "{suAnkiEsma.anlam}"
                  </p>
                </div>
              </div>

              <div className="bg-teal-50/60 p-3.5 rounded-2xl border border-teal-100 text-xs space-y-2.5">
                <p className="text-gray-800 font-medium leading-relaxed">
                  <strong className="text-teal-900">Fazileti:</strong> {suAnkiEsma.fazilet}
                </p>

                <div className="pt-2 border-t border-teal-200/60 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs text-teal-900 font-bold">
                    <span>📿 Zikir Sayısı: <strong className="text-teal-700 font-mono text-sm">{suAnkiEsma.zikir}</strong></span>
                    <span className="text-[10px] text-teal-600 font-semibold uppercase tracking-wider">İsme Git</span>
                  </div>

                  <select
                    value={esmaIndex}
                    onChange={(e) => setEsmaIndex(Number(e.target.value))}
                    className="w-full bg-white border border-teal-200 hover:border-teal-400 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer shadow-2xs transition"
                  >
                    {ESMA_UL_HUSNA.map((eItem, idx) => (
                      <option key={idx} value={idx} className="bg-white text-slate-900 font-medium py-1">
                        {idx + 1}. {eItem.isim} ({eItem.arapca})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* NAMAZ GEÇMİŞİ VE İSTATİSTİK ÖZET KARTI */}
            <div className="maneviyat-card bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-black/5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-gray-900">📜 Namaz Geçmişim</h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    Kayıtlı Veritabanı
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-4">Günlük eda edilen namazlar otomatik olarak tarih bazlı saklanır.</p>

                {(() => {
                  const kilinanVakitSayisi = ['sabahVakti', 'ogleVakti', 'ikindiVakti', 'aksamVakti', 'yatsiVakti'].filter(k => bugunNamazData[k]).length;
                  const yuzde = Math.round((kilinanVakitSayisi / 5) * 100);

                  return (
                    <div className="space-y-3 bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                      <div className="flex justify-between items-center text-xs font-bold text-emerald-950">
                        <span>Bugünkü Durum</span>
                        <span className="text-emerald-700">{kilinanVakitSayisi} / 5 Vakit (%{yuzde})</span>
                      </div>
                      <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${yuzde}%` }} />
                      </div>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        {kilinanVakitSayisi === 5 ? "🎉 Maşallah! Bugünkü tüm vakitler eda edildi." : `Günün kalan vakitlerini eda edebilirsiniz.`}
                      </p>
                    </div>
                  );
                })()}
              </div>

              <button
                onClick={() => setAktifSekme('namaz_gecmisi')}
                className="w-full mt-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>📜 Tüm Namaz Geçmişini Gör</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* --- 3. DİĞER SEKMELER (NAMAZ GEÇMİŞİ, TEFEKKÜR NOTLARI, DİYANET TAKVİMİ VE FAVORİLER) --- */}

      {/* NAMAZ GEÇMİŞİ SEKMESİ */}
      {aktifSekme === 'namaz_gecmisi' && (() => {
        const tumTarihler = Object.keys(namazGecmisi).sort((a, b) => b.localeCompare(a));
        if (!namazGecmisi[bugunStr]) {
          tumTarihler.unshift(bugunStr);
        }

        let toplamVakit = 0;
        let kilinanVakit = 0;
        Object.values(namazGecmisi).forEach(dayData => {
          ['sabahVakti', 'ogleVakti', 'ikindiVakti', 'aksamVakti', 'yatsiVakti'].forEach(k => {
            toplamVakit++;
            if (dayData[k]) kilinanVakit++;
          });
        });
        const genelYuzde = toplamVakit > 0 ? Math.round((kilinanVakit / toplamVakit) * 100) : 0;

        return (
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border border-black/5 dark:border-slate-800 shadow-sm space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h2 className="text-2xl sm:text-3xl font-serif text-slate-900 dark:text-white font-bold tracking-tight">
                  📜 Namaz Geçmişi & İstatistikler
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
                  Eski günlere ait namaz kayıtlarınızı inceleyin, eksikleri tamamlayın ve takibinizi yapın.
                </p>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest block">
                    GENEL KILINMA ORANI
                  </span>
                  <span className="text-lg font-extrabold text-emerald-950 dark:text-white font-mono">
                    %{genelYuzde}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {tumTarihler.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <span className="text-4xl block mb-2">📜</span>
                  <p className="text-sm font-medium">Henüz kaydolmuş bir namaz geçmişiniz bulunmuyor.</p>
                </div>
              ) : (
                tumTarihler.map(tarihKey => {
                  const dayData = namazGecmisi[tarihKey] || { sabahVakti: false, ogleVakti: false, ikindiVakti: false, aksamVakti: false, yatsiVakti: false };
                  const isToday = tarihKey === bugunStr;
                  const dObj = new Date(tarihKey);
                  const tarihTR = dObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
                  const kilinanCount = ['sabahVakti', 'ogleVakti', 'ikindiVakti', 'aksamVakti', 'yatsiVakti'].filter(k => dayData[k]).length;

                  return (
                    <div
                      key={tarihKey}
                      className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isToday
                          ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border-emerald-300 dark:border-emerald-800 shadow-sm'
                          : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                        }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isToday ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                            {isToday ? 'Bugün' : 'Geçmiş'}
                          </span>
                          <h4 className="font-serif font-bold text-slate-900 dark:text-white text-base">
                            {tarihTR}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          5 vakitten <strong className="text-emerald-700 dark:text-emerald-400">{kilinanCount} vakit</strong> kılındı (%{Math.round((kilinanCount / 5) * 100)})
                        </p>
                      </div>

                      <div className="grid grid-cols-5 gap-2 w-full md:w-auto">
                        {[
                          { key: 'sabahVakti', ad: 'Sabah' },
                          { key: 'ogleVakti', ad: 'Öğle' },
                          { key: 'ikindiVakti', ad: 'İkindi' },
                          { key: 'aksamVakti', ad: 'Akşam' },
                          { key: 'yatsiVakti', ad: 'Yatsı' }
                        ].map(vakit => {
                          const eda = dayData[vakit.key];

                          return (
                            <button
                              key={vakit.key}
                              onClick={() => namazVaktiToggle(vakit.key, tarihKey)}
                              className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center gap-1 ${eda
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                                }`}
                              title={`${tarihTR} - ${vakit.ad} Namazını Değiştir`}
                            >
                              <span>{vakit.ad}</span>
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${eda ? 'bg-white text-emerald-800 font-extrabold' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                {eda ? '✓' : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* TEFEKKÜR NOTLARI VE MANEVİ GÜNLÜK SEKMESİ (TAMAMEN BEYAZ, FERAH VE SADE KART TASARIMI) */}
      {aktifSekme === 'tefekkur' && (() => {
        const filtrelenmisNotlar = tefekkurNotlari.filter(n =>
          !tefekkurArama ||
          n.baslik.toLowerCase().includes(tefekkurArama.toLowerCase()) ||
          n.icerik.toLowerCase().includes(tefekkurArama.toLowerCase())
        );

        return (
          <div className="space-y-8 animate-fade-in">
            {/* NOT EKLE / DÜZENLE KARTI (BEMBEYAZ FERAH KART) */}
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-md space-y-5">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-xl sm:text-2xl font-serif text-slate-900 font-bold tracking-tight">
                    {duzenlenenNotId ? 'Tefekkür Notunu Düzenle' : 'Yeni Tefekkür & Şükür Notu Ekle'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Günün muhasebesi, şükürlerin ve manevi hedeflerin.
                  </p>
                </div>

                {duzenlenenNotId && (
                  <button
                    onClick={() => { setDuzenlenenNotId(null); setYeniNotForm({ baslik: '', icerik: '', kategori: 'Tefekkür' }); }}
                    className="text-xs bg-red-50 text-red-600 font-bold px-3.5 py-1.5 rounded-xl border border-red-200 hover:bg-red-100 transition cursor-pointer"
                  >
                    Vazgeç
                  </button>
                )}
              </div>

              {/* Form Alanları (Açık Gri Kutu Üzerine %100 Simsiyah/Lacivert Yazı) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={yeniNotForm.baslik}
                  onChange={e => setYeniNotForm({ ...yeniNotForm, baslik: e.target.value })}
                  placeholder="Not Başlığı (Örn: Bugünkü Şükrüm, Özel Duan...)"
                  className="sm:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition shadow-2xs"
                  style={{ color: '#0f172a', backgroundColor: '#f8fafc' }}
                />

                <select
                  value={yeniNotForm.kategori}
                  onChange={e => setYeniNotForm({ ...yeniNotForm, kategori: e.target.value })}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 outline-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition shadow-2xs"
                  style={{ color: '#0f172a', backgroundColor: '#f8fafc' }}
                >
                  <option value="Tefekkür" className="bg-white text-slate-900 font-semibold">Tefekkür</option>
                  <option value="Şükür" className="bg-white text-slate-900 font-semibold">Şükür</option>
                  <option value="Dua" className="bg-white text-slate-900 font-semibold">Dua</option>
                  <option value="Manevi Hedef" className="bg-white text-slate-900 font-semibold">Manevi Hedef</option>
                </select>
              </div>

              <textarea
                value={yeniNotForm.icerik}
                onChange={e => setYeniNotForm({ ...yeniNotForm, icerik: e.target.value })}
                placeholder="Düşüncelerini, dualarını veya bugün şükrettiğin şeyleri buraya detaylıca yaz..."
                className="w-full h-36 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none leading-relaxed transition shadow-2xs"
              />

              <div className="flex justify-end pt-1">
                <button
                  onClick={tefekkurNotKaydet}
                  className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <span>{duzenlenenNotId ? 'Notu Güncelle' : 'Kaydet'}</span>
                </button>
              </div>
            </div>

            {/* ESKİ KAYDEDİLEN NOTLAR LİSTESİ (BEMBEYAZ FERAH KART) */}
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
                    Eski Tefekkür Notlarım <span className="text-emerald-600 font-sans text-base font-bold">({tefekkurNotlari.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kaydedilmiş tüm geçmiş notlarınızı okuyabilir, düzenleyebilir veya silebilirsiniz.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={tefekkurArama}
                    onChange={e => setTefekkurArama(e.target.value)}
                    placeholder="Notlarda ara..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {tefekkurArama && (
                    <button onClick={() => setTefekkurArama('')} className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600">✕</button>
                  )}
                </div>
              </div>

              {filtrelenmisNotlar.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <p className="text-sm font-medium">Henüz kayıtlı bir tefekkür notunuz bulunmuyor.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filtrelenmisNotlar.map(not => (
                    <div
                      key={not.id}
                      className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-2xs flex flex-col justify-between relative group hover:border-emerald-400 transition"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/80">
                            {not.kategori || 'Tefekkür'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold">
                            {not.tarih}
                          </span>
                        </div>

                        <h4 className="font-serif font-bold text-slate-900 text-lg mb-2">
                          {not.baslik}
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-700 font-normal leading-relaxed whitespace-pre-line mb-4">
                          {not.icerik}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                        <button
                          onClick={() => tefekkurNotDuzenleBaslat(not)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs transition cursor-pointer border border-amber-200"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => tefekkurNotSil(not.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs transition cursor-pointer border border-red-200"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ULTRA SADE & ELEGANT BEMBEYAZ DİNİ GÜNLER SEKMESİ (CANLI ALADHAN API) */}
      {aktifSekme === 'takvim' && (() => {
        const gelecekGunler = diniGunlerCanli.filter(g => g.farkGun >= 0).sort((a, b) => a.farkGun - b.farkGun);
        const enYakinGun = gelecekGunler.length > 0 ? gelecekGunler[0] : (diniGunlerCanli[0] || null);

        const filtrelenmisGunler = diniGunlerCanli.filter(gun => {
          const kategoriUygun = takvimFiltre === 'tum' || gun.kategori === takvimFiltre;
          const aramaUygun = !takvimArama ||
            gun.ad.toLowerCase().includes(takvimArama.toLowerCase()) ||
            (gun.miladiTarih && gun.miladiTarih.toLowerCase().includes(takvimArama.toLowerCase())) ||
            (gun.hicriTarih && gun.hicriTarih.toLowerCase().includes(takvimArama.toLowerCase()));
          return kategoriUygun && aramaUygun;
        });

        return (
          <div className="space-y-6 animate-fade-in">
            {/* Bildirim Toast */}
            {bildirimMesaji && (
              <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-bounce">
                <span className="text-xs font-semibold">{bildirimMesaji}</span>
              </div>
            )}

            {/* 1. ÖNE ÇIKAN EN YAKLAŞAN GÜN (BEMBEYAZ FERAH KART) */}
            {diniGunlerYukleniyor ? (
              <div className="bg-white text-slate-900 p-8 rounded-[2.5rem] border border-slate-200 shadow-md text-center py-12">
                <div className="inline-block animate-spin text-3xl mb-2 text-emerald-600">🔄</div>
                <h3 className="text-base font-serif font-bold text-slate-800">İnternetten Dini Günler Çekiliyor...</h3>
                <p className="text-xs text-slate-500 mt-1">Aladhan Live API ile Senkronize Ediliyor (Hicri {seciliHicriYil})</p>
              </div>
            ) : enYakinGun ? (
              <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-md relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-3 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-200">
                        En Yaklaşan Mübarek Gün
                      </span>
                      <span className="bg-slate-100 text-slate-600 text-[11px] font-medium px-3 py-1 rounded-full border border-slate-200">
                        Hicri Takvim Senkronize
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center text-3xl shadow-2xs">
                        {enYakinGun.ikon}
                      </div>
                      <div>
                        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
                          {enYakinGun.ad}
                        </h3>
                        <p className="text-emerald-700 text-xs font-semibold mt-0.5">
                          📅 {enYakinGun.hicriTarih}
                        </p>
                      </div>
                    </div>

                    <p className="text-slate-600 text-xs sm:text-sm font-light leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      "{enYakinGun.anlam}"
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        onClick={() => setSeciliDetayGun(enYakinGun)}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-2"
                      >
                        <span>İbadet & Dua Rehberi</span>
                      </button>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${enYakinGun.ad} - ${enYakinGun.hicriTarih}`);
                          bildirimGoster("Dini gün bilgisi panoya kopyalandı.");
                        }}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer"
                      >
                        Kopyala / Paylaş
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 text-center min-w-[170px] w-full md:w-auto shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      KALAN SÜRE
                    </span>
                    <span className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 block my-1">
                      {enYakinGun.farkGun === 0 ? "BUGÜN!" : enYakinGun.farkGun < 0 ? "GEÇTİ" : `${enYakinGun.farkGun} Gün`}
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold block mt-1">
                      {enYakinGun.farkGun === 0 ? "Mübarek Gün Geldi" : enYakinGun.farkGun < 0 ? "Tamamlandı" : "Kaldı"}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* 2. KONTROL PANELİ & TAKVİM FİLTRELERİ (BEMBEYAZ KART) */}
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-md space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-serif text-slate-900 font-bold">
                    Dini Günler & Kandiller Takvimi
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Kalan günler bugünün Hicri takvim tarihine göre anında hesaplanmaktadır (Hicri {seciliHicriYil}).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200">
                    {[
                      { hicri: 1447, miladi: '2025' },
                      { hicri: 1448, miladi: '2026' },
                      { hicri: 1449, miladi: '2027' },
                      { hicri: 1450, miladi: '2028' }
                    ].map(y => (
                      <button
                        key={y.hicri}
                        onClick={() => setSeciliHicriYil(y.hicri)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${seciliHicriYil === y.hicri
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {y.miladi} ({y.hicri})
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => diniGunleriYukle(seciliHicriYil)}
                    disabled={diniGunlerYukleniyor}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3.5 py-2 rounded-xl cursor-pointer border border-slate-200 transition"
                    title="İnternetten Canlı Yenile"
                  >
                    Yenile ↻
                  </button>
                </div>
              </div>

              {/* Kategori Filtreleri & Arama */}
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'tum', etiket: 'Tüm Günler', count: diniGunlerCanli.length },
                    { id: 'kandil', etiket: 'Kandil Geceleri', count: diniGunlerCanli.filter(g => g.kategori === 'kandil').length },
                    { id: 'bayram', etiket: 'Bayramlar', count: diniGunlerCanli.filter(g => g.kategori === 'bayram').length },
                    { id: 'ozel_gun', etiket: 'Üç Aylar & Özel Günler', count: diniGunlerCanli.filter(g => g.kategori === 'ozel_gun').length }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setTakvimFiltre(f.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${takvimFiltre === f.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {f.etiket} <span className="opacity-70 text-[10px]">({f.count})</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1 sm:w-64">
                    <input
                      type="text"
                      value={takvimArama}
                      onChange={e => setTakvimArama(e.target.value)}
                      placeholder="Dini gün ara..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {takvimArama && (
                      <button onClick={() => setTakvimArama('')} className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600">✕</button>
                    )}
                  </div>

                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setTakvimGorunum('grid')}
                      className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer ${takvimGorunum === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400'}`}
                      title="Izgara Görünümü"
                    >
                      ⊞
                    </button>
                    <button
                      onClick={() => setTakvimGorunum('timeline')}
                      className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer ${takvimGorunum === 'timeline' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400'}`}
                      title="Liste Görünümü"
                    >
                      ≡
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. DİNİ GÜNLER KART IZGARASI */}
              {diniGunlerYukleniyor ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-xs font-semibold">Dini gün verileri yükleniyor...</p>
                </div>
              ) : filtrelenmisGunler.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <p className="text-sm font-medium">Aramanızla eşleşen dini gün bulunamadı.</p>
                  <button onClick={() => { setTakvimFiltre('tum'); setTakvimArama(''); }} className="text-xs text-emerald-600 font-bold underline cursor-pointer">
                    Filtreleri Temizle
                  </button>
                </div>
              ) : takvimGorunum === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                  {filtrelenmisGunler.map((gun) => {
                    const isPast = gun.farkGun < 0;
                    const isToday = gun.farkGun === 0;

                    return (
                      <div
                        key={gun.id}
                        className={`p-6 rounded-3xl transition-all flex flex-col justify-between border bg-white border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md ${isToday ? 'ring-2 ring-emerald-500' : isPast ? 'opacity-70 bg-slate-50/60' : ''
                          }`}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {gun.kategori === 'kandil' ? 'Kandil Gecesi' : gun.kategori === 'bayram' ? 'Bayram' : 'Özel Gün'}
                            </span>

                            <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${isToday
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : isPast
                                  ? 'bg-slate-100 text-slate-500 border-slate-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}>
                              {isToday ? 'Bugün!' : isPast ? 'Geçti' : `${gun.farkGun} Gün Kaldı`}
                            </span>
                          </div>

                          <h4 className="font-serif font-bold text-slate-900 text-lg mb-1">
                            {gun.ad}
                          </h4>

                          <div className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-xl text-xs font-semibold font-serif my-2">
                            Hicri: {gun.hicriTarih}
                          </div>

                          <p className="text-xs text-slate-600 font-light line-clamp-2 leading-relaxed mb-4">
                            {gun.anlam}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex justify-between items-center gap-2">
                          <button
                            onClick={() => setSeciliDetayGun(gun)}
                            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <span>İbadet & Detayları Gör</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ZAMAN ÇİZELGESİ LİSTE GÖRÜNÜMÜ */
                <div className="space-y-3 pt-2">
                  {filtrelenmisGunler.map((gun) => {
                    const isPast = gun.farkGun < 0;
                    const isToday = gun.farkGun === 0;

                    return (
                      <div
                        key={gun.id}
                        className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border-slate-200 hover:border-emerald-400 ${isPast ? 'opacity-70 bg-slate-50' : ''}`}
                      >
                        <div>
                          <h4 className="font-serif font-bold text-slate-900 text-base">
                            {gun.ad}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            📅 Hicri: <strong>{gun.hicriTarih}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${isToday
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : isPast
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                            {isToday ? 'Bugün!' : isPast ? 'Geçti' : `${gun.farkGun} Gün Kaldı`}
                          </span>

                          <button
                            onClick={() => setSeciliDetayGun(gun)}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                          >
                            Detaylar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. SADE & SHIK İBADET MODALI */}
            {seciliDetayGun && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
                <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-y-auto p-6 sm:p-8 space-y-6 relative">
                  <button
                    onClick={() => setSeciliDetayGun(null)}
                    className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-xs font-bold cursor-pointer transition"
                  >
                    ✕
                  </button>

                  <div className="border-b border-slate-100 pb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      {seciliDetayGun.kategori === 'kandil' ? 'Kandil Gecesi' : seciliDetayGun.kategori === 'bayram' ? 'Bayram' : 'Özel Gün'}
                    </span>
                    <h3 className="text-2xl font-serif font-bold text-slate-900 mt-2">
                      {seciliDetayGun.ad}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      📅 Hicri Tarih: <strong className="text-emerald-700 font-serif">{seciliDetayGun.hicriTarih}</strong>
                    </p>
                  </div>

                  <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 space-y-1">
                    <h4 className="text-xs font-bold text-emerald-950">Günün Anlamı ve Hikmeti</h4>
                    <p className="text-xs sm:text-sm text-slate-800 font-light leading-relaxed">
                      {seciliDetayGun.anlam}
                    </p>
                  </div>

                  {seciliDetayGun.ibadetler && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Tavsiye Edilen İbadetler (Eda Ettiklerini İşaretle)
                      </h4>

                      <div className="space-y-2">
                        {seciliDetayGun.ibadetler.map((ibadet, idx) => {
                          const isDone = tamamlananIbadetler[`${seciliDetayGun.id}_${idx}`];

                          return (
                            <button
                              key={idx}
                              onClick={() => ibadetToggle(seciliDetayGun.id, idx)}
                              className={`w-full p-3.5 rounded-2xl text-xs sm:text-sm font-semibold transition flex items-center justify-between border cursor-pointer ${isDone
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                              <span>{ibadet}</span>
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${isDone ? 'bg-white text-emerald-800 border-white' : 'border-slate-300 text-slate-400'}`}>
                                {isDone ? '✓' : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Özel Zikir ve Tesbihatlar */}
                  {seciliDetayGun.zikirler && (
                    <div className="bg-amber-50/60 dark:bg-amber-950/40 p-4 sm:p-5 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <span>📿</span> Özel Zikir ve Tesbihat
                      </h4>
                      <p className="text-xs sm:text-sm text-amber-950 dark:text-amber-100 font-serif italic">
                        "{seciliDetayGun.zikirler}"
                      </p>
                    </div>
                  )}

                  {/* 4. Günün Kutsal Ayeti / Hadisi */}
                  {seciliDetayGun.ayetHadis && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span>📖</span> Günün Ayet-i Kerimesi / Hadis-i Şerifi
                      </h4>
                      <blockquote className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-serif italic border-l-3 border-amber-400 pl-3 py-0.5">
                        {seciliDetayGun.ayetHadis}
                      </blockquote>
                    </div>
                  )}

                  {/* Alt Kapat Butonu */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      onClick={() => setSeciliDetayGun(null)}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
                    >
                      Kapat
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        );
      })()}

      {aktifSekme === 'favoriler' && (
        <div className="maneviyat-card bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-black/5 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-serif text-gray-900 font-normal">Favori Ayet & Hadislerim</h2>
              <p className="text-gray-500 text-sm">Kaydettiğin ilham verici mesajlar.</p>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              {favoriler.length} Kayıtlı
            </span>
          </div>

          {favoriler.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-4xl block mb-2">★</span>
              <p className="text-sm font-medium">Henüz favorilere eklenmiş bir ayet veya hadis yok.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {favoriler.map((item, idx) => (
                <div key={idx} className="p-5 bg-gray-50 border border-black/5 rounded-3xl relative group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      {item.tur === 'ayet' ? '📖 Ayet-i Kerime' : '✨ Hadis-i Şerif'}
                    </span>
                    <button
                      onClick={() => setFavoriler(favoriler.filter(f => f.metin !== item.metin))}
                      className="text-xs text-red-400 hover:text-red-600 transition cursor-pointer"
                    >
                      Kaldır ✕
                    </button>
                  </div>
                  <p className="text-gray-800 font-serif italic text-sm leading-relaxed mb-2">
                    "{item.metin}"
                  </p>
                  <div className="text-xs text-gray-500 font-semibold">
                    {item.kaynak}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}