import { createTheme, mergeStyleSets, Theme } from "@fluentui/react";
import { store } from "./local-storage";

// https://fluentuipr.z22.web.core.windows.net/heads/master/theming-designer/index.html

const readTheme = (): Theme => {
  switch (store.theme) {
    default:
      // return getTheme();
      return createTheme({
        palette: {
          greenLight: 'lime',
          teal: 'black', // abused for foreground colour in bubbles

          purple: 'rgba(0, 0, 0, .05)',
          purpleLight: 'rgb(238, 238, 238)',
          purpleDark: '#e5e5e5',
        }
      });

    case 'dark/blue': return createTheme({
      palette: {
        themePrimary: '#3f87d4',
        themeLighterAlt: '#030508',
        themeLighter: '#0a1622',
        themeLight: '#13293f',
        themeTertiary: '#26517f',
        themeSecondary: '#3877ba',
        themeDarkAlt: '#5092d8',
        themeDark: '#68a1de',
        themeDarker: '#8cb8e7',
        neutralLighterAlt: '#01011c',
        neutralLighter: '#030325',
        neutralLight: '#080834',
        neutralQuaternaryAlt: '#0b0b3d',
        neutralQuaternary: '#0f0f45',
        neutralTertiaryAlt: '#232365',
        neutralTertiary: '#eeeeee',
        neutralSecondary: '#f1f1f1',
        neutralSecondaryAlt: '#f1f1f1',
        neutralPrimaryAlt: '#f4f4f4',
        neutralPrimary: '#e5e5e5',
        neutralDark: '#f9f9f9',
        black: '#fcfcfc',
        white: '#000012',

        // hand edited
        greenLight: '#00CC00', // abused for background colour in bubbles
        teal: '#000000', // abused for foreground colour in bubbles (white)
        purple: 'rgb(0, 96, 150, 0.5)', // fade
        purpleLight: '#00324d', // greyer
        purpleDark: '#195494', // grey + lines
      }
    });

    case 'dark/orange': return createTheme({
      palette: {
        themePrimary: '#d36f00',
        themeLighterAlt: '#080500',
        themeLighter: '#221200',
        themeLight: '#3f2200',
        themeTertiary: '#7f4400',
        themeSecondary: '#ba6300',
        themeDarkAlt: '#d87d16',
        themeDark: '#de8f35',
        themeDarker: '#e7aa66',
        neutralLighterAlt: '#0b0702',
        neutralLighter: '#150d05',
        neutralLight: '#25180a',
        neutralQuaternaryAlt: '#2f1f0e',
        neutralQuaternary: '#372512',
        neutralTertiaryAlt: '#594028',
        neutralTertiary: '#f8ebda',
        neutralSecondary: '#f9eee0',
        neutralSecondaryAlt: '#f9eee0',
        neutralPrimaryAlt: '#faf2e6',
        neutralPrimary: '#f4e1c8',
        neutralDark: '#fdf8f2',
        black: '#fefbf8',
        white: '#000000',

        // hand edited
        greenLight: '#00CC00', // abused for background colour in bubbles
        teal: '#211203', // abused for foreground colour in bubbles (white)
        purple: 'rgb(224, 146, 0, 0.5)', // fade
        purpleLight: '#4d3200', // greyer
        purpleDark: '#824500', // grey + lines
      }
    });

    case 'white/green': return createTheme({
      palette: {
        themePrimary: '#3c8223',
        themeLighterAlt: '#f5faf3',
        themeLighter: '#d7ebd0',
        themeLight: '#b7daaa',
        themeTertiary: '#7ab465',
        themeSecondary: '#4d9134',
        themeDarkAlt: '#367520',
        themeDark: '#2e631b',
        themeDarker: '#224914',
        neutralLighterAlt: '#f3f8f1',
        neutralLighter: '#eff4ed',
        neutralLight: '#e5eae3',
        neutralQuaternaryAlt: '#d5dad3',
        neutralQuaternary: '#ccd0ca',
        neutralTertiaryAlt: '#c4c8c2',
        neutralTertiary: '#081503',
        neutralSecondary: '#0a1c04',
        neutralSecondaryAlt: '#0a1c04',
        neutralPrimaryAlt: '#0c2204',
        neutralPrimary: '#163d08',
        neutralDark: '#113006',
        black: '#143607',
        white: '#f9fff7',

        // hand edited
        greenLight: '#00CC00', // abused for background colour in bubbles
        teal: '#143607', // abused for foreground colour in bubbles (white)
        purple: 'rgb(60, 130, 35, 0.5)', // fade
        purpleLight: '#e6f2e1', // greyer
        purpleDark: '#b7daaa', // grey + lines
      }
    });

  }
};

export const appTheme = readTheme();

export const cn = mergeStyleSets({
  h3: {
    borderBottom: appTheme.palette.purpleDark + ' 1px solid',
  },
  /** border-bottom */
  bb: {
    borderBottom: appTheme.palette.purpleDark + ' 1px solid',
  },
  /** border-top */
  bt: {
    borderTop: appTheme.palette.purpleDark + ' 1px solid',
  },
  /** border-right */
  br: {
    borderRight: appTheme.palette.purpleDark + ' 1px solid',
  },
  /** border-left */
  bl: {
    borderLeft: appTheme.palette.purpleDark + ' 1px solid',
  },
  footer: {
    borderTop: appTheme.palette.purpleDark + ' 1px solid',
    boxShadow: '0 -0.1rem 2rem 0px ' + appTheme.palette.purple,
    backgroundColor: appTheme.palette.white,
  },
  topBar: {
    borderTop: appTheme.palette.purpleDark + ' 1px solid',
    borderBottom: appTheme.palette.purpleDark + ' 1px solid',
    boxShadow: '0 .25rem .75rem ' + appTheme.palette.purple,
  },
  grey: {
    backgroundColor: appTheme.palette.purpleDark,
  },
  greyer: {
    backgroundColor: appTheme.palette.purpleLight,
  },
  odd: {
    backgroundColor: appTheme.palette.neutralSecondary,
  },
  surplus: {
    color: appTheme.palette.white,
    backgroundColor: appTheme.palette.greenLight,
  },
  deficit: {
    color: appTheme.palette.white,
    backgroundColor: appTheme.palette.yellow,
  },
  navy: {
    backgroundColor: appTheme.palette.themeSecondary,
  },
  removable: {
    ':hover': { backgroundColor: appTheme.palette.themeLight },
  },
  btn: {
    ':hover': {
      color: appTheme.palette.white + '!important', // why?
      backgroundColor: appTheme.palette.themeTertiary,
    },
    ':active': {
      backgroundColor: appTheme.palette.themeSecondary,
    }
  },
});
