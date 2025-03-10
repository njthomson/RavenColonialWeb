import { getTheme } from "@fluentui/react";


// const theme = loadTheme({
//   palette: {
//     white: '#FF99aa',


//     // themeSecondary: '#FF0000',
//   },
//   semanticColors: {
//     bodyText: '#00FFFF',
//     buttonText: '#00FFFF',
//     primaryButtonText: '#00FFFF',
//     link: '#ff00ff',
//     bodyBackground: '#12345',
//   },
//   defaultFontStyle: {
//     color: '#FF0000'

//   }

// });
// // const theme2 =getTheme();
// const styles = {
//   root: [
//     {
//       background: 'black',
//       color: 'red',
//       // backgroundImage: url('assets/back.png'),
//       // backgroundRepeat: 'repeat',
//       selectors: {
//         ':hover': {
//           background: 'navy', //theme.palette.themeSecondary,
//         },
//         '&.isExpanded': {
//           display: 'block'
//         },
//         '&:hover .childElement': {
//           color: 'white'
//         }
//       }
//     }
//   ]
// };

export const appTheme = getTheme();

// TODO: figure out a proper dark theme
/*
export const appTheme = createTheme({
  palette: {
    accent: `#450c7b`,
    blue: `#450c7b`,
    themePrimary: '#5b0da5', //'#0078d4',
    themeLighterAlt: '#f3f9fd',
    themeLighter: '#d0e7f8',
    themeLight: '#a9d3f2',
    themeTertiary: '#5ca9e5',
    themeSecondary: '#1a86d9',
    themeDarkAlt: '#7a00ef', //'#006cbe',
    themeDark: '#7a00ef', //'#005ba1',
    themeDarker: '#004377',
    neutralLighterAlt: '#3c3c3c',
    neutralLighter: '#444444',
    neutralLight: '#515151',
    neutralQuaternaryAlt: '#595959',
    neutralQuaternary: '#5f5f5f',
    neutralTertiaryAlt: '#7a7a7a',
    neutralTertiary: '#c8c8c8',
    neutralSecondary: '#d0d0d0',
    neutralPrimaryAlt: '#dadada',
    neutralPrimary: '#f88d01', // '#ddca20', // '#ffffff',
    neutralDark: '#f4f4f4',
    black: '#f8f8f8',
    white: '00FFFFFF', // background
  },
});
*/