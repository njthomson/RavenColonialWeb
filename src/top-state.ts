// type Pair<S> = [S | undefined, Dispatch<SetStateAction<S | undefined>>]

export interface ProjectRef {
  buildId: string;
  buildName: string;
  buildType?: string;

  marketId?: number;
  systemAddress?: number;
  systemName?: string;
  x?: number;
  y?: number;
  z?: number;

  bodyNum?: number;
  bodyName?: string;

  architectName: string;
  factionName: string;
}

export interface Project extends ProjectRef {
  commanders?: Record<string, string[]>;
  commodities?: Record<string, number>;
}

export interface QueryProject {
  systemName: string
};

export interface TopState {
  pivot: TopPivot;
  query?: QueryProject | undefined;
  buildId?: string| undefined;
  proj?: Project | undefined;
}


export interface AppProps {
  ts: TopState;
  setTS: React.Dispatch<React.SetStateAction<TopState>>;
}



export enum TopPivot {
  home = 'home',
  find = 'find',
  build = 'build',
  cmdr = 'cmdr',
  about = 'about',
}

// const topState = createContext({
//   pivot: TopPivot.home,
//   // setTS : Any; //Dispatch<SetStateAction<S | undefined>
// });

// export const useTopState = () => {
//   return useContext(topState);
// }


// const usePair = (obj: any, key: string, val: any) => {
//   const [getVal, setVal] = useState(val);

//   Object.defineProperty(obj, key, {
//     get: () => {
//       return val;
//     },
//     set: (newVal: any) => {
//       setVal(newVal);
//     },
//     enumerable: true,
//     configurable: true,
//   });
// }



// export const useFoo = <T>(raw: Record<string, Pair<unknown>>): T => {
//   const obj = {};

//   for (const key in raw) {

//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     const [getVal, setVal] = raw[key];

//     Object.defineProperty(obj, key, {
//       get: () => {
//         return getVal;
//       },
//       set: (newVal: any) => {
//         setVal(newVal);
//       },
//       enumerable: true,
//       configurable: true,
//     });
//   }

//   return obj as T;
// };

// export const tsRaw = {};

// // export const useInitialState = () => {
// //   if (tsRaw) { return; }

// //   tsRaw = {
// //     topPivot: useState(TopPivot.home),
// //   };

// // }

// // export const ts = useFoo<TopState>(tsRaw);
