import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Breakdowns } from './breakdowns.js';

export function defineBreakdownTemplates() {

  //if (Breakdowns.findOne({})) return;

//Kettős könyvelés verzió

  Breakdowns.define({ communityId: null,   //1-es kész
    digit: '1', name: 'BEFEKTETETT ESZKÖZÖK', locked: true, sign: +1,
    children: [
        { digit: '3', name: 'MŰSZAKI BERENDEZÉSEK' },
        { digit: '4', name: 'EGYÉB BERENDEZÉSEK' },
        { digit: '6', name: 'BERUHÁZÁSOK' },
        { digit: '8', name: 'HITELVISZONYT MEGTESTESÍTŐ ÉRTÉKPAPÍROK' },
    ],
  });

  Breakdowns.define({ communityId: null,  // 2-es kész
    digit: '2', name: 'KÉSZLETEK', locked: true, sign: +1,
    children: [
        { digit: '1', name: 'ANYAGOK' },
        { digit: '2', name: 'KÖZVETÍTETT SZOLGÁLTATÁSOK' },
    ],
  });

  Breakdowns.define({ communityId: null,  // 3-AS SZÁMLAOSZTÁLY KÉSZ  TODO angol neveket átírni
    digit: '3', name: 'Assets', locked: true, sign: +1,  //KÖVETELÉSEK
    children: [
      { digit: '1', name: 'Customers',
        children: [
        ],
      },
      { digit: '3', name: 'Owner obligations', // KÖVETELÉSEK TULAJDONOSSAL SZEMBEN
        include: 'Owner payin types',
      },
      { digit: '4', name: 'HÁTRALÉKOK',
        children: [
        { digit: '1', name: 'Jelzáloggal nem terhelt hátralék' },
        { digit: '2', name: 'Jelzáloggal terhelt hátralék' },
        { digit: '3', name: 'Közös tulajdon hasznosításának hátraléka' },
        ],
      },
      { digit: '6', name: 'EGYÉB KÖVETELÉSEK' },
      { digit: '8', name: 'Money accounts',
        include: 'Money accounts', // PÉNZESZKÖZÖK
      },
      { digit: '9', name: 'AKTÍV IDŐBELI ELHATÁROLÁSOK' },
    ],
  });

  Breakdowns.define({ communityId: null,   // 4 -es kész
    digit: '4', name: 'Liabilities', locked: true, sign: -1,  // FORRÁSOK
    children: [
      { digit: '1', name: 'Equity', locked: true,  //  SAJÁT TŐKE
        children: [
          { digit: '3', name: 'Eredménytartalék' },
          { digit: '9', name: 'Adózott eredmény' },
        ],
      },
      { digit: '3', name: 'Unidentified items',  // NEM AZONOSÍTOTT TÉTELEK
        children: [
        { digit: '1', name: 'Unidentified incomes' }, // Nem azonosított bevételek
        { digit: '2', name: 'Befizetések dijbeszedőn keresztül' },
        { digit: '3', name: 'Postai befizetések' },
        { digit: '4', name: 'Unidentified expenses' }, //Nem azonosított Kiadások
        ],
      },
      { digit: '4', name: 'HOSSZÚ LEJÁRATÚ KÖTELEZETTSÉGEK',
        children: [
         { digit: '1', name: 'Hosszú lejáratú bank hitel' },
         { digit: '2', name: 'Beruházási és fejlesztési hitelek' },
         { digit: '3', name: 'Egyéb hitel' },
        ],
      },
      { digit: '5', name: 'RÖVID LEJÁRATÚ KÖTELEZETTSÉGEK',
        children: [
         { digit: '1', name: 'Rövid lejáratú bank Hitel' },
         { digit: '2', name: 'Egyéb rövid lejáratú kötelezettségek' },
        ],
      },
      { digit: '6', name: 'Suppliers' },
      { digit: '8', name: 'PASSZÍV IDŐBELI ELHATÁROLÁSOK' },
      { digit: '9', name: 'ÉVI MÉRLEGSZÁMLÁK',
        children: [
         { digit: '1', name: 'Opening account' },
         { digit: '2', name: 'Closing account' },
         { digit: '3', name: 'Adózott eredmény elszámolása' },
         { digit: '4', name: 'Előző évi eredmény elszámolása' },
        ],
      },
    ],
  });
  Breakdowns.define({ communityId: null,
    digit: '5', name: 'KÖLTSÉGNEMEK', locked: true, sign: +1,  // 5-ös számlaosztály kész
    children: [
      { digit: '1', name: 'ANYAGKÖLTSÉG',
        children: [

           { digit: '01', name: 'Víz díj' },
           { digit: '02', name: 'Áram díj' },
           { digit: '03', name: 'Gáz díj' },
           { digit: '04', name: 'Irodai anyagok' },
           { digit: '05', name: 'Karbantartási segédanyagok' },
           { digit: '06', name: 'Égők,felszerelési anyagok' },
           { digit: '07', name: 'Egyéb anyagok' },
        ],
      },
      { digit: '2', name: 'SZOLGÁLTATÁSOK KÖLTSÉGEI',
        children: [
          { digit: '01', name: 'Csatorna díjak' },
          { digit: '02', name: 'Szemét díjak' },
          { digit: '03', name: 'Takarítás' },
          { digit: '04', name: 'Kommunikációs költségek' },
          { digit: '05', name: 'Könyvelési díj' },
          { digit: '06', name: 'Közösképviselet díja' },
          { digit: '07', name: 'Jogi költségek' },
          { digit: '08', name: 'Karbantartás' },
          { digit: '09', name: 'Javítások' },
          { digit: '10', name: 'Biztonsági költségek' },
          { digit: '11', name: 'Tagdíjak' },
          { digit: '12', name: 'Kertészet' },
          { digit: '13', name: 'Egyéb megbízási, vállalkozási díjak' },
        ],
      },
      { digit: '3', name: 'EGYÉB SZOLGÁLTATÁSOK KÖLTSÉGEI',
        children: [
           { digit: '1', name: 'Hatósági díjak' },
           { digit: '2', name: 'Pénzügyi  díjak' },
           { digit: '3', name: 'Biztosítási díjak' },
        ],
      },
      { digit: '4', name: 'BÉRKÖLTSÉG'},
      { digit: '5', name: 'SZEMÉLYI JELLEGŰ EGYÉB KÖLTSÉG' },
      { digit: '6', name: 'BÉRJÁRULÉKOK' },
      { digit: '7', name: 'ÉRTÉKCSÖKKENÉSI LEÍRÁS' }, 
      { digit: '9', name: 'KÖLTSÉGNEMEK ÁTVEZETÉSE' },
    ],
  });
  Breakdowns.define({ communityId: null,  //8-as számlaosztály  kész
    digit: '8', name: 'Expenses', locked: true, sign: +1, // RÁFORDÍTÁSOK
    children: [
      { digit: '1', name: 'ANYAGJELLEGŰ RÁFORDÍTÁSOK',
        children: [
         { digit: '01', name: 'Víz díj' },
         { digit: '02', name: 'Áram díj' },
         { digit: '03', name: 'Gáz díj' },
         { digit: '04', name: 'Csatorna díjak' },
         { digit: '05', name: 'Szemét díjak' },
         { digit: '06', name: 'Irodai anyagok' },
         { digit: '07', name: 'Karbantartási segédanyagok' },
         { digit: '08', name: 'Égők,felszerelési anyagok' },
         { digit: '09', name: 'Egyéb anyagok' },
         { digit: '10', name: 'Takarítás' },
         { digit: '11', name: 'Kommunikációs költségek' },
         { digit: '12', name: 'Könyvelési díj' },
         { digit: '13', name: 'Közösképviselet díja' },
         { digit: '14', name: 'Jogi költségek' },
         { digit: '15', name: 'Karbantartás' },
         { digit: '16', name: 'Javítások' },
         { digit: '17', name: 'Biztonsági költségek' },
         { digit: '18', name: 'Tagdíjak' },
         { digit: '19', name: 'Kertészet' },
         { digit: '20', name: 'Egyéb megbízási, vállalkozási díjak' },
         { digit: '21', name: 'Hatósági díjak' },
         { digit: '22', name: 'Biztosítási díjak' },
         { digit: '23', name: 'Egyéb anyag jellegű ráfordítások' },
        ],
      },
      { digit: '2', name: 'SZEMÉLYI JELLEGŰ RÁFORDÍTÁSOK',
        children: [
        { digit: '1', name: 'Bérköltség' },
        { digit: '2', name: 'Személyi jellegű egyéb költség' },
        { digit: '3', name: 'Bérjárulékok' },
        ],
      },
      { digit: '3', name: 'ÉRTÉKCSÖKKENÉSI LEÍRÁS',
        children: [
        { digit: '1', name: 'Értékcsökkenési leírás' },
        ],
      },
      { digit: '6', name: 'EGYÉB RÁFORDÍTÁSOK',
        children: [
        { digit: '1', name: 'Adók és bírságok' },
        { digit: '2', name: 'Egyéb ráfordítás' },
        ],
      },
      { digit: '7', name: 'PÉNZÜGYI RÁFORDÍTÁSOK',
        children: [
        { digit: '1', name: 'Kamat és bank költségek' },
        ],
      },
      { digit: '9', name: 'EREDMÉNYT TERHELŐ ADÓK',
        children: [
        { digit: '1', name: 'Társasági adó' },
        ],
      },
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '9', name: 'Incomes', locked: true, sign: -1,   // BEVÉTELEK
    children: [
      { digit: '1', name: 'ÉRTÉKESÍTÉS ÁRBEVÉTELE',
        children: [
        { digit: '1', name: 'Bérleti díj bevételek' },
        { digit: '5', name: 'Egyéb adóköteles bevételek' },
        ],
      },
      { digit: '5', name: 'Owner payins',
        include: 'Owner payin types',
      },
      { digit: '6', name: 'EGYÉB BEVÉTELEK',
        children: [
        { digit: '6', name: 'Támogatások' },
        { digit: '7', name: 'Biztosítói kártérítés' },
        { digit: '8', name: 'Kártérítések' },
        { digit: '9', name: 'Különféle egyéb bevételek' },
        ],
      },
      { digit: '7', name: 'PÉNZÜGYI MŰVELETEK BEVÉTELEI',
        children: [
        { digit: '3', name: 'Hitelintézettől kapott kamatok' },
        { digit: '4', name: 'Egyéb pénzügyi bevételek' },
        ],
      },
      { digit: '8', name: 'RENDKIVÜLI BEVÉTELEK',
      },
    ],
  });
  Breakdowns.define({ communityId: null,
    name: 'Owner payin types', locked: true,
    children: [
    { digit: '1', name: 'Közös költség előírás' },
    { digit: '2', name: 'Fogyasztás előírás',
      children: [
        { digit: '1', name: 'Hidegvíz előírás' },
        { digit: '2', name: 'Melegvíz előírás' },
        { digit: '3', name: 'Csatornadíj előírás' },
        { digit: '4', name: 'Fűtési díj előírás' },
        { digit: '5', name: 'Légkondícionáló előírás' },
        { digit: '6', name: 'Egyéb fogyasztás előírás' },
      ],
    },
    { digit: '3', name: 'Fejlesztési alap előírás' },
    { digit: '4', name: 'Egyéb előírás' },
    { digit: '5', name: 'Rendkivüli befizetés előírás' },
    ],
  });

  Breakdowns.define({ communityId: null,
    name: 'COA', label: 'Chart Of Accounts',
    children: [
//      { digit: '0', name: 'Opening' },// TECHNIKAI SZÁMLÁK
      { digit: '1', include: 'BEFEKTETETT ESZKÖZÖK' },
      { digit: '2', include: 'KÉSZLETEK' },
      { digit: '3', include: 'Assets' }, //KÖVETELÉSEK
      { digit: '4', include: 'Liabilities' }, // FORRÁSOK
      { digit: '5', include: 'KÖLTSÉGNEMEK' },
      { digit: '8', include: 'Expenses' }, // RÁFORDÍTÁSOK
      { digit: '9', include: 'Incomes' }, //BEVÉTELEK
    ],
  });

  Breakdowns.define({ communityId: null,
    name: 'Money accounts', children: [
      { digit: '1', name: 'Cash register', category: 'cash', primary: true }, // Pénztár
      { digit: '2', name: 'Checking account', category: 'bank', primary: true }, // Folyószámla
      { digit: '3', name: 'Savings account', category: 'bank', primary: false }, // Megtakarítási számla
//      { digit: '4', name: 'Fundamenta' },
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '@', name: 'Parcels', children: [   // Albetétek
      { digit: '', name: 'Main building' },  //Épület, kivettem az "A"-t  a UI "building"-et ír ki
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '#', name: 'Places', children: [ // Elszámolási egységek
      { digit: '0', name: 'Central' },   // Központ
      { digit: '1', name: 'Common areas', // Közös tulajdonú helyiségek
        children: [
          { digit: '1', name: 'Padlás' },
          { digit: '2', name: 'Pince' },
          { digit: '3', name: 'Kert' },
          { digit: '4', name: 'Tárolók' },
          { digit: '5', name: 'Garázs' },
          { digit: '6', name: 'Lépcsőház' },
          { digit: '7', name: 'Folyosók' },
          { digit: '9', name: 'Egyeb helyiségek' },
        ],
      },
      { digit: '2', name: 'Tartószerkezetek',
        children: [
          { digit: '1', name: 'Falak' },
          { digit: '2', name: 'Födémek' },
          { digit: '3', name: 'Tető' },
        ],
      },
      { digit: '3', name: 'Szakipari szerkezetek',
        children: [
          { digit: '1', name: 'Homlokzat' },
          { digit: '2', name: 'Burkolat' },
        ],
      },
      { digit: '4', name: 'Gépészeti szerkezetek',
        children: [
          { digit: '1', name: 'Ventillation' }, // Szellőző rendszer
          { digit: '3', name: 'Heating system' }, // Kazán
          { digit: '4', name: 'Klima' },
          { digit: '5', name: 'Villamos hálózat' },
          { digit: '6', name: 'Felügyeleti rendszer' },
          { digit: '7', name: 'Lift' },
          { digit: '8', name: 'Kamera rendszer' },
        ],
      },
    ],
  });

  Breakdowns.define({ communityId: null,
    digit: '', name: 'Localizer', label: 'Localizers',
    children: [
      { digit: '@', name: 'Parcels', include: 'Parcels',
      },
      { digit: '#', name: 'Places', include: 'Places',
      },
    ],
  });
}

if (Meteor.isServer) {
  Meteor.startup(defineBreakdownTemplates);
}

/*
export const ACCOUNTS_PAYABLE = '46';
export const ACCOUNTS_RECEIVABLE = '31';
export const ACCOUNTS_RECEIVABLE_FROM_PARCELS = '33';
*/
