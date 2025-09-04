import { createTheme, mergeStyleSets, registerIcons, Theme } from "@fluentui/react";
import { store } from "./local-storage";
import { FilterDescendingIcon } from "@fluentui/react-icons-mdl2";

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
      isInverted: true,
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

        blackTranslucent40: 'rgb(255, 255, 255, 0.2)',
        whiteTranslucent40: 'rgb(0, 0, 0, 0.2)',
      }
    });

    case 'dark/orange': return createTheme({
      isInverted: true,
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

        blackTranslucent40: 'rgb(255, 255, 255, 0.2)',
        whiteTranslucent40: 'rgb(0, 0, 0, 0.2)',
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

    case 'dark/green': return createTheme({
      isInverted: true,
      palette: {
        themePrimary: '#d1d93b',
        themeLighterAlt: '#080902',
        themeLighter: '#212309',
        themeLight: '#3f4112',
        themeTertiary: '#7d8223',
        themeSecondary: '#b8bf33',
        themeDarkAlt: '#d5dd4c',
        themeDark: '#dce265',
        themeDarker: '#e5ea8a',
        neutralLighterAlt: '#325250',
        neutralLighter: '#385957',
        neutralLight: '#426462',
        neutralQuaternaryAlt: '#486b6a',
        neutralQuaternary: '#4e716f',
        neutralTertiaryAlt: '#658987',
        neutralTertiary: '#c8c8c8',
        neutralSecondary: '#d0d0d0',
        neutralSecondaryAlt: '#d0d0d0',
        neutralPrimaryAlt: '#dadada',
        neutralPrimary: '#ffffff',
        neutralDark: '#f4f4f4',
        black: '#f8f8f8',
        white: 'rgb(30, 53, 51)',

        // hand edited
        greenLight: '#00CC00', // abused for background colour in bubbles
        teal: '#143607', // abused for foreground colour in bubbles (white)
        purple: 'rgb(60, 130, 35, 0.5)', // fade
        purpleLight: 'rgb(50, 87, 82)', // greyer
        purpleDark: 'rgb(131, 163, 119)', // grey + lines
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
    zIndex: 10,
    borderTop: appTheme.palette.purpleDark + ' 1px solid',
    boxShadow: '0 -0.1rem 2rem 0px ' + appTheme.palette.purple,
    backgroundColor: appTheme.palette.white,
  },
  topBar: {
    borderBottom: appTheme.palette.purpleDark + ' 1px solid',
    boxShadow: '0 .25rem .75rem ' + appTheme.palette.purple,
  },
  grey: {
    backgroundColor: appTheme.palette.purpleDark,
  },
  greyer: {
    backgroundColor: appTheme.palette.purpleLight,
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
  trh: {
    ':hover': {
      backgroundColor: appTheme.palette.neutralLight,
    }
  },
  padSize: {
    cursor: 'default',
    color: appTheme.palette.themeSecondary,
    backgroundColor: appTheme.palette.neutralLight,
    border: '1px solid ' + appTheme.palette.themeTertiary,
    fontSize: 10,
    textAlign: 'center',
  },
  trhi: {
    ':hover': {
      backgroundColor: appTheme.palette.themeLight + '!important',
    }
  },
  dibi: {
    color: appTheme.palette.neutralPrimary,
    ':hover': {
      color: appTheme.palette.black,
    },
  },
  bodyScroll: {
    // "::-webkit-scrollbar": {
    //   width: 10,
    //   background: appTheme.palette.neutralQuaternaryAlt,
    // },
    // "::-webkit-scrollbar-thumb": {
    //   background: 'red', //appTheme.palette.themeTertiary,
    // },
    scrollbarWidth: 10,
    scrollbarColor: appTheme.palette.themeTertiary + ' ' + appTheme.palette.neutralQuaternaryAlt,
  },
  /** Floating panel. Callout, ContextMenu, etc */
  fp: {
    border: '1px solid ' + appTheme.palette.themePrimary,
    padding: 0,
  },
  /** ActionButton, as ContextMenu trigger */
  abm: {
    selectors: { '.arr': { color: 'grey', marginLeft: 4, fontSize: 10 } },
    ':hover': { selectors: { '.arr': { color: appTheme.palette.themeTertiary } } },
  },
  /** Dim IconButton */
  ibDim: {
    color: appTheme.palette.themeTertiary,
    ':hover': {
      color: appTheme.palette.themePrimary,
      border: `1px solid ${appTheme.palette.themeTertiary}`,
    },
  },
  /** Bright IconButton */
  ibBri: {
    color: appTheme.palette.themeSecondary,
    ':hover': {
      color: appTheme.palette.themePrimary,
      border: `1px solid ${appTheme.palette.themeTertiary}`,
    },
  },
  ibText: {
    color: appTheme.semanticColors.bodyText,
    ':hover': {
      color: appTheme.palette.themePrimary,
      border: `1px solid ${appTheme.palette.themeTertiary}`,
    },
  },
  /** Draw a box around a button on hover */
  bBox: {
    border: `1px solid transparent`,
    ':hover': {
      zIndex: 2,
      border: `1px solid ${appTheme.palette.themeTertiary}`,
    },
  },
  /** Draw a box around a button on hover, with partial and solid background colours */
  bBoxS: {
    border: `1px solid transparent`,
    backgroundColor: appTheme.palette.whiteTranslucent40,
    ':hover': {
      zIndex: 2,
      border: `1px solid ${appTheme.palette.themeTertiary}`,
      backgroundColor: appTheme.palette.white,
    },
  },

  /** Draw a box around a button, highlight on hover */
  bBox2: {
    border: `1px solid ${appTheme.palette.themeTertiary}`,
    ':hover': {
      zIndex: 2,
      border: `1px solid ${appTheme.palette.themeSecondary}`,
    },
    ':disabled': {
      color: 'grey',
      zIndex: 2,
      border: `1px solid grey`,
    },
  },
  /** Make text bold on hover */
  bBold: {
    ':hover': {
      fontWeight: 'bold',
    },
  },
  pillSmall: {
    borderRadius: 5,
    height: '18px!important',
    padding: '0 3px',
    margin: 1,
    fontSize: 12,
    backgroundColor: appTheme.palette.neutralTertiaryAlt,
  },
});


export const getThemedIconFC = (outer: string, inner?: string, fill: string = 'none') => {
  return <svg
    width={16} height={16}
    viewBox="0 0 7 7"
    xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(-54.499,-114.25)" >
      <g>
        <path
          style={{ fill: fill, stroke: outer, strokeWidth: 0.5 }}
          d="m 58.159721,114.43229 h -0.396449 l -2.414998,4.58976 1.517275,1.50463 0.997723,-0.75863 h 0.396449" />
        <path
          style={{ fill: fill, stroke: outer, strokeWidth: 0.5 }}
          d="m 58.129721,114.43229 h 0.396449 l 2.414998,4.58976 -1.517275,1.50463 -0.997723,-0.75863 h -0.396449" />
      </g>
      <ellipse
        style={{ fill: 'none', stroke: inner ?? outer, strokeWidth: 0.4 }}
        cx="58.139721" cy="117.85513" rx="1.1" ry="1.1"
      />
      <rect
        style={{ fill: 'none', stroke: inner ?? outer, strokeWidth: 0.4 }}
        width="0.9" height="0.009065479"
        x="57.68" y="117.8506"
      />
    </g>
  </svg>;
}

export const getThemedIconSolidFC = (outer: string, inner?: string, fill: string = 'none') => {
  return <svg
    width={16} height={16}
    viewBox="0 0 7 7"
    xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(-54.7,-114.25)" >
      <g>
        <path
          style={{ fill: fill, stroke: outer, strokeWidth: 0.5 }}
          d="m 58.159721,114.43229 h -0.396449 l -2.414998,4.58976 1.517275,1.50463 0.997723,-0.75863 h 0.396449" />
        <path
          style={{ fill: fill, stroke: outer, strokeWidth: 0.5 }}
          d="m 58.129721,114.43229 h 0.396449 l 2.414998,4.58976 -1.517275,1.50463 -0.997723,-0.75863 h -0.396449" />
      </g>
      <ellipse
        style={{ fill: 'none', stroke: inner ?? outer, strokeWidth: 0.5 }}
        cx="58.139721" cy="117.85513" rx="1.2" ry="1.2"
      />
      <rect
        style={{ fill: 'none', stroke: inner ?? outer, strokeWidth: 0.5 }}
        width="0.7" height="0.009065479"
        x="57.80" y="117.8506"
      />
    </g>
  </svg>;
}


registerIcons({
  icons: {
    'fleetCarrier': getThemedIconFC(appTheme.palette.themeDarkAlt),
    'fleetCarrierBlack': getThemedIconFC(appTheme.palette.neutralPrimary),
    'fleetCarrierSolid': getThemedIconSolidFC(appTheme.palette.themeDarkAlt, appTheme.palette.white, appTheme.palette.themeDarkAlt),
    'fleetCarrierBlackSolid': getThemedIconSolidFC(appTheme.palette.neutralPrimary, appTheme.palette.white, appTheme.palette.neutralPrimary),
    FilterDescending: <FilterDescendingIcon />,
  }
});
