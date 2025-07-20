import React from "react";
import ReactDOM from "react-dom/client";
import { TextToVideo } from "./ttVideoPrueba";

const rootElement = document.getElementById("root");
const myHeritageData = [
  {
    identifier: 18,
    name: "Suwon Hwaseong Fortress",
    latitude: 37.2811,
    longitude: 127.0157,
    image:
      "https://eu2.contabostorage.com/7fb97413b6c243adb4347dafa02551a9:ocity/heritage/images/1733934352393_hwaseong_fortress.png",
    addressProvince: "Gyeonggi Province",
    addressLocality: "Suwon",
    addressCountry: "KR",
    type: "Cultural",
    description: {
      local: {
        short:
          "Hwaseong Haenggung Palace is the largest temporary palace in Korea, with a total of 576 spaces, and it has beauty and grandeur.",
        extended:
          "정조는 1789년 10월, 아버지 사도세자의 무덤인 현륭원을 옮긴 이후 1800년(정조 24년) 1월까지 12년간 13차례에 걸쳐 수원행차를 거행했으며, 이때마다 화성행궁에 머물렀습니다. 1795년에는 화성행궁 봉수당에서 어머니 혜경궁 홍씨의 환갑을 기념하는 진찬연을 여는 등 여러 가지 행사를 거행하였습니다. 화성행궁은 평상시에는 화성유수부 유수가 집무하는 관청으로도 활용되었습니다. 그러나, 일제강점기 이후 갖가지 용도의 건물로 이용되면서, 그 모습을 잃게 되었습니다. 화성축성 200주년인 1996년부터 복원 공사를 시작해 2003년 일반인에게 공개하였습니다.",
      },
      english: {
        short:
          "Hwaseong Haenggung Palace is the largest temporary palace in Korea, with a total of 576 spaces, and it features beauty and grandeur.",
        extended:
          "After moving Hyeonryungwon, the tomb of his father, Crown Prince Sado, in October 1789, Jeongjo held 13 trips to Suwon for 12 years until January 1800, and each time he stayed at Hwaseong Haenggung Palace. In 1795, various events were held at Hwaseong Haenggung, including a banquet to commemorate the 60th birthday of his mother Hyegyeonggung Hong. The palace was also used as a government office. During the Japanese colonial period, it was repurposed for other uses and lost its appearance. Restoration began in 1996 and the palace reopened in 2003.",
      },
    },
  },
  {
    identifier: 2007,
    name: "Mirador del Mediterráneo",
    latitude: 39.08487017422064,
    longitude: -0.24853563658447264,
    image:
      "https://eu2.contabostorage.com/7fb97413b6c243adb4347dafa02551a9:ocity/heritage/images/bc86271253d17348dc4a84d5990675468218939b1719412247.jpg",
    addressProvince: "Valencia",
    addressLocality: "Tavernes de la Valldigna",
    addressCountry: "ES",
    type: "Natural",
    description: {
      local: {
        short:
          "Desde el llamado Mirador del Mediterráneo o de la Valldigna se divisa el paisaje agrario actual, ribeteado por el mar.",
        extended:
          "Desde el llamado Mirador del Mediterráneo o de la Valldigna se divisa el paisaje agrario actual, ribeteado por el mar. Los arrozales de antaño dieron paso a los huertos de naranjos a mediados del siglo XX. Hoy conviven el azul del mar, el pardo de la marjal y el verde de los árboles. Este paisaje forma parte de la “Ruta del Racó de Joana”, situada en Tavernes de la Valldigna, un tesoro de belleza natural y biodiversidad. El sendero serpentea a través de colinas y vegetación autóctona, ofreciendo vistas espectaculares. Alberga especies como encinas, romeros, tomillos, águilas, zorros y más.",
      },
      english: {
        short:
          "From the so-called Mirador del Mediterráneo or Mirador de la Valldigna you can see the current agricultural landscape, bordered by the sea.",
        extended:
          "From the so-called Mirador del Mediterráneo or Mirador de la Valldigna you can see the current agricultural landscape, bordered by the sea. The rice fields of yesteryear gave way to orange groves in the mid-20th century. Today, the blue of the sea coexists with the brown of the marshland and the green of the trees. This landscape is part of the well-known 'Ruta del Racó de Joana' in Tavernes de la Valldigna, a treasure of natural beauty and biodiversity. The trail winds through lush landscapes filled with native flora and fauna, offering an immersive hiking experience.",
      },
    },
  },
  {
    identifier: 1404,
    name: "La Casa de la Cultura",
    latitude: 39.739598493506705,
    longitude: -0.27137924407615976,
    image:
      "https://eu2.contabostorage.com/7fb97413b6c243adb4347dafa02551a9:ocity/heritage/images/8b984d247f407596e96cbb67db03d28514aaec441664443977.png",
    addressProvince: "Valencia",
    addressLocality: "Quart de les Valls",
    addressCountry: "ES",
    type: "Cultural",
    description: {
      local: {
        short:
          "Se trata de una iglesia asentada sobre un templo primitivo gótico que sería ampliado en el siglo XVIII.",
        extended:
          "Edificio de interés histórico-cultural, clasificado como Monumento Histórico Artístico Nacional. Antiguamente iglesia de San Miguel (siglo XVII), fue restaurada en los 80 y transformada en la Casa de Cultura. Conserva su estructura original con nave central, capillas laterales, coro alto y campanario.",
      },
      english: {
        short:
          "This is a church built over a primitive Gothic temple that was enlarged in the 18th century.",
        extended:
          "A building of historic-cultural interest, classified as a National Historic-Artistic Monument. Formerly the Church of San Miguel (17th century), it was restored in the 1980s and converted into the Casa de Cultura. It preserves the original structure, with a central nave, side chapels, upper choir, and bell tower.",
      },
    },
  },
  {
    identifier: 1998,
    name: "Lithuanian Language",
    latitude: 54.678422563507475,
    longitude: 25.28583120957031,
    image:
      "https://eu2.contabostorage.com/7fb97413b6c243adb4347dafa02551a9:ocity/heritage/images/lithuanian_language.jpg",
    addressProvince: "Vilnius City Municipality",
    addressLocality: "Vilnius",
    addressCountry: "LT",
    type: "Intangible",
    description: {
      local: {
        short:
          "Lietuvių kalba – iš baltų prokalbės kilusi lietuvių tautos kalba.",
        extended:
          "Lietuvių kalba – iš baltų prokalbės kilusi lietuvių tautos kalba, kuri Lietuvoje yra valstybinė, o Europos Sąjungoje – viena iš oficialiųjų kalbų. Lietuviškai kalba apie tris milijonus žmonių (dauguma jų gyvena Lietuvoje).",
      },
      english: {
        short:
          "Lithuanian is an East Baltic language belonging to the Baltic branch of the Indo-European family.",
        extended:
          "Lithuanian is an East Baltic language belonging to the Baltic branch of the Indo-European language family. It is the official language of Lithuania and one of the official languages of the EU. It has about 2.8 million native speakers in Lithuania and around 1 million abroad.",
      },
    },
  },
  {
    identifier: 959,
    name: "Abdel Algaum Gate",
    latitude: 15.6339430240317,
    longitude: 32.490977357153305,
    image:
      "https://eu2.contabostorage.com/7fb97413b6c243adb4347dafa02551a9:ocity/heritage/images/f50d46809e5ec7b5093913b1c1190fd13a19a4a81653583983.jpg",
    addressProvince: "Khartoum",
    addressLocality: "Khartoum",
    addressCountry: "SD",
    type: "Cultural",
    description: {
      local: {
        short: "Abdel Algaum Gate is one of the most famous gates in Khartoum.",
        extended:
          "It holds cultural and architectural significance and is known for its historical relevance in the region.",
      },
      english: {
        short: "Abdel Algaum Gate is one of the most famous gates in Khartoum.",
        extended:
          "This gate holds architectural and cultural significance in Khartoum and is a symbol of the city's historical heritage.",
      },
    },
  },
];

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <TextToVideo
      heritageItems={myHeritageData}
      targetLanguage="en"
      descriptionLength="short"
    />
  );
}
