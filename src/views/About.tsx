import { DefaultButton, Icon, IconButton, Link, Stack } from "@fluentui/react";
import { LinkSrvSurvey } from "../components/LinkSrvSurvey";
import { appTheme, cn } from "../theme";
import { mapStatusIcon } from "./SystemView2/ViewEditStatus";
import { App } from "../App";

export const learnAbout = (currentHelpId?: string) => {

  const showHelp = (helpId: string) => {
    if (helpId !== currentHelpId) {
      window.location.hash = `#about=${helpId}`;
    } else {
      window.location.hash = `#about`;
    }
  };

  const topics: Record<string, string> = {
    feedback: 'Feedback',
    raven: 'Raven Colonial',
    srvsurvey: 'SrvSurvey',
    apps: 'Apps and clients',
    sys: 'Planning a system',
    find: 'Finding a project',
    create: 'Creating a project',
    build: 'Building a project',
    groups: 'Working in groups',
    fc: 'Linking Fleet Carriers',
    markets: 'Finding markets',
  }

  return <div className={`home-box rel ${cn.greyer}`}>
    <h3 className={cn.h3}>Learn more about: <span style={{ marginLeft: 10, fontSize: 10, fontWeight: 'normal' }}>Watch <LinkSrvSurvey href='https://youtu.be/Kt4MpUJ-ISI?si=FPTNMEBlNP4a3lQl' text="CMDR Mechan's tutorial"></LinkSrvSurvey></span></h3>
    <Stack horizontal wrap tokens={{ childrenGap: 10, padding: 10, }}>
      {Object.entries(topics).map(([key, text]) => <DefaultButton key={key} text={text} onClick={() => showHelp(key)} primary={currentHelpId === key} />)}
    </Stack>
  </div>
};

export const About: React.FunctionComponent = () => {
  window.document.title = `About Raven Colonial Corporation`;

  const params = new URLSearchParams(window.location.hash?.substring(1));
  const helpId = params.get('about') ?? undefined;

  return <>
    {learnAbout(helpId)}


    {(!helpId || helpId === 'feedback') && <div className={`home-box rel ${cn.greyer}`}>
      <h3 className={cn.h3}>Feedback</h3>
      If you have any issues or suggestions for Raven Colonial or SrvSurvey, please send me your <Link onClick={() => App.showFeedback()}>Feedback<Icon className='icon-inline' iconName='Feedback' style={{ textDecoration: 'none', marginLeft: 4 }} /></Link>.
      If you would like to support my work, please consider <Link onClick={() => document.getElementById('send-support')?.click()}>a donation</Link>.
      <br />
      Bugs can be <LinkSrvSurvey href='https://github.com/njthomson/SrvSurvey/issues' text='reported on GitHub' title='Submit suggestions and bug reports' /> and general discussion happens through <LinkSrvSurvey href='https://discord.gg/nEWMqZNBdy' text="Discord" title='Discuss SrvSurvey' />
      <br />
      <br />
      Thanks,
      <br />
      <br />
      ~ CMDR Grinning2001
      <IconBtnScrollTop />
    </div >}


    {(!helpId || helpId === 'raven') && <div className={`home-box rel ${cn.greyer}`}>
      <h3 className={cn.h3}>The Raven Colonial Corporation</h3>
      From the earliest times in history, mankind has looked to expand. We have sought to explore and thrive.  From the old earth Abrahamic religions, we were told to "go forth, and multiply."  This was the task given to Noah in the days after the dove returned with signs of land. Go forth, and Multiply.
      <br />
      But it wasn't a dove, over the years the translation was lost, in the original story it was a raven.
      <br /><br />
      Now, thousands of years later, the Raven Colonial Corporation wishes to continue that millenias old command.
      <br /><br />
      Go forth, and Multiply.
      <br />
      <ul>
        <li>The Raven Colonial Corporation supports colonization efforts whether working solo or in groups, with or without Fleet Carriers.</li>
        <li>Using SrvSurvey to monitor local journal file changes, progress will be tracked automatically as you conduct your affairs.</li>
        <li>Use the <Icon className="btn icon-inline" iconName='UserWarning' /> / <Icon className="btn icon-inline" iconName='Contact' /> button in the top right corner to set your Commander name and the cargo hold sizes for your commonly used ship. See more below working with Fleet Carriers.</li>
        <IconBtnScrollTop />
      </ul>
      RavenColonial and SrvSurvey are not official tools for "Elite Dangerous" and are not affiliated with Frontier Developments. All trademarks and copyright are acknowledged as the property of their respective owners.
    </div>}


    {(!helpId || helpId === 'srvsurvey') && <div className={`home-box rel ${cn.greyer}`}>
      <h3 className={cn.h3}>About SrvSurvey</h3>
      Issues can be <LinkSrvSurvey href='https://github.com/njthomson/SrvSurvey/issues' text='reported on GitHub' title='Submit suggestions and bug reports' /> and general discussion happens through <LinkSrvSurvey href='https://discord.gg/nEWMqZNBdy' text="Discord" title='Discuss SrvSurvey' />
      <ul>
        <li>See more detailed guidance on the <LinkSrvSurvey text='SrvSurvey colonization wiki' /></li>
        <li>Use the big Colonize button on the main window enable Colonization features and to create new projects.</li>
        <li>Once enabled cargo tracking will happen automatically at construction sites and linked Fleet Carriers.</li>
        <li>Use the Colonize {">"} Refresh button after changing links or assignments on the web site. (Coming soon) use this button to set a periodic refresh.</li>
      </ul>
      SrvSurvey can be installed through <LinkSrvSurvey href='https://github.com/njthomson/SrvSurvey/releases/' text='GitHub' title='Latest pre-releases, frequently updated' /> or via the <span style={{ fontWeight: 'bold' }}><LinkSrvSurvey href='https://www.microsoft.com/store/productId/9NGT6RRH6B7N' text='Windows App Store' title='Windows App Store - less frequently updated' /></span> which now supports colonization features.
      <IconBtnScrollTop />
    </div>}


    {(!helpId || helpId === 'apps') && <div className={`home-box rel ${cn.greyer}`}>
      <h3 className={cn.h3}>Apps and Clients</h3>
      Raven Colonial is able to track things automatically through the use of client apps running on your PC as you play the game.
      <br /><br />
      The original client app for Raven Colonial is <LinkSrvSurvey /> and is maintained by the same author as this website, but there are alternatives with differing levels of integration:
      <ul>
        <li><LinkSrvSurvey href='https://github.com/aussig/BGS-Tally' text='https://github.com/aussig/BGS-Tally' title='' /></li>
        <li><LinkSrvSurvey href='https://github.com/toemaus313/ravencolonial_edmc' text='https://github.com/toemaus313/ravencolonial_edmc' title='' /></li>
      </ul>
      It is worth noting that Raven Colonial pulls data from other Elite Dangerous community sites, namely <LinkSrvSurvey href='https://spansh.co.uk' text='Spansh' title='' /> and <LinkSrvSurvey href='https://www.edsm.net/' text='EDSM' title='' />. These sites are fed by players running apps that upload to <LinkSrvSurvey href='https://github.com/EDCD/EDDN/blob/master/README.md' text='EDDN' title='' /> as they play and without these contributions we are all starved for data. If not already, please consider running such an app when you play. My favourites are:
      <ul>
        <li><LinkSrvSurvey href='https://github.com/EDCD/EDMarketConnector/wiki' text='EDMC' title='' /> paired with <LinkSrvSurvey href='https://github.com/canonn-science/EDMC-Canonn/releases' text='The Canonn plugin' title='' /></li>
        <li><LinkSrvSurvey href='https://github.com/EDDiscovery/EDDiscovery/wiki' text='EDDiscovery' title='' /></li>
      </ul>
      <IconBtnScrollTop />
    </div>}


    {(!helpId || helpId === 'sys') && <div className={`home-box rel ${cn.greyer}`}>
      <h3 className={cn.h3}>Planning a system</h3>
      The game doesn't allow us to change or remove anything once started so it is vital to plan out a system. Use <Link href='/#sys'><Icon className="icon-inline" iconName='HomeGroup' style={{ textDecoration: 'none', marginRight: 4 }} />system</Link> to view a summary of all systems you have architected.
      You may need to search once to make them appear.
      <br />
      Once viewing a system:
      <ul>
        <li>When first viewed, Raven Colonial will automatically import body and port data from <LinkSrvSurvey href='https://spansh.co.uk' text='Spansh' title='spansh.co.uk' />. If needed, you can manually import again from the <span style={{ color: appTheme.palette.themePrimary }}><Icon className="icon-inline" iconName='Add' style={{ textDecoration: 'none' }} /> Add</span> sub-menu.</li>
        <li>Raven Colonial tracks the whole system, showing a list of things to fix in the right panel, eg: not enough tier points, missing pre-req's or similar issues.</li>
        <li>Toggle between <Icon className="icon-inline" iconName='Nav2DMapView' style={{ color: appTheme.palette.themePrimary }} /> Map and <Icon className="icon-inline" iconName='GridViewSmall' style={{ color: appTheme.palette.themePrimary }} /> Table view to easily edit many sites or to get a sense of where everything is located.</li>
        <li>Add new sites in any location or at any project phase: <Icon className="icon-inline" iconName={mapStatusIcon.plan} style={{ color: appTheme.palette.themePrimary }} /> planning, <Icon className="icon-inline" iconName={mapStatusIcon.build} style={{ color: appTheme.palette.themePrimary }} /> building, or <Icon className="icon-inline" iconName={mapStatusIcon.complete} style={{ color: appTheme.palette.themePrimary }} /> construction complete.</li>
        <li>View the impact each site has on the system and other sites nearby. Pin a site to see details about it. This will update in real time as you make changes.</li>
        <li>Use <Icon className="icon-inline" iconName='Camera' style={{ color: appTheme.palette.themePrimary }} /> to snapshot panels. This allows for easily comparing differences whilst making changes to your system.</li>
        <li>Use <Icon className="icon-inline" iconName='TestBeakerSolid' style={{ color: appTheme.palette.themePrimary }} /> to control if incomplete stations are included in calculations or not.</li>
        <li>Use <Icon className="icon-inline" iconName='FabricFolderSearch' style={{ color: appTheme.palette.themePrimary }} /> to view a list of all economies in your system. This also lets you compare with values from <LinkSrvSurvey href='https://spansh.co.uk' text='Spansh' title='spansh.co.uk' />, if they are known.</li>
        <IconBtnScrollTop />
      </ul>
    </div >}


    {(!helpId || helpId === 'find') && <div className={`home-box rel ${cn.greyer}`}>
      <h3 className={cn.h3}>Finding a project</h3>
      <ul>
        <li>The home page will show any projects linked to your Commander, active or completed, as well as the last 5 projects you have viewed.</li>
        <li>Existing projects can be found on the <Link href='/#sys'><Icon className="icon-inline" iconName='HomeGroup' style={{ textDecoration: 'none' }} /> system</Link> page - look for sites marked with <Icon className="icon-inline" iconName='ConstructionCone' style={{ color: appTheme.palette.yellowDark }} /></li>
        <li>New construction projects can be started from the Add sub-menu, though it is recommended to start them via <LinkSrvSurvey /></li>
        <li>You do not need to be linked to a Project project to view details and contribute to it.</li>
        <li>When available, use the <span style={{ color: appTheme.palette.themePrimary }}><Icon className="btn icon-inline" iconName='OfficeChatSolid' /> Discord</span> button to check with others working this project.</li>
        <IconBtnScrollTop />
      </ul>
    </div >}


    {(!helpId || helpId === 'create') && <div className={`home-box rel ${cn.greyer}`}>
      <h3 className={cn.h3}>Creating a project</h3>
      <ul>
        <li>Creating projects is best done through <LinkSrvSurvey /> as it can pre-populate required cargo as well as other details pulled from journal files.</li>
        <li>It is also possible to create projects through this site, though will require some manual data entry.</li>
        <li>From <Link href='/#sys'><Icon className="icon-inline" iconName='HomeGroup' style={{ textDecoration: 'none' }} /> system</Link>, search for the relevant system, then click <span style={{ color: appTheme.palette.themePrimary }}><Icon className="icon-inline" iconName='Manufacturing' style={{ textDecoration: 'none' }} /> New Construction</span> in the <span style={{ color: appTheme.palette.themePrimary }}><Icon className="icon-inline" iconName='Add' style={{ textDecoration: 'none' }} /> Add</span> sub-menu.</li>
        <li>In the right hand panel, choose the site, or if is not known, you will have to manually find the marketID value in journal files. Click the <Icon className="icon-inline" iconName="Info" style={{ color: appTheme.palette.themePrimary }} /> button for instructions.</li>
        <li>Enter a name and choose the project type. Eg: Vulcan, Coriolis, Chronos, etc. You can find this information when docked at the construction site.</li>
        <li>After creating the site, you will need to manually enter cargo amounts. Or visit the site with SrvSurvey running and these numbers will be populated automatically.</li>
        <IconBtnScrollTop />
      </ul>
    </div>}


    {(!helpId || helpId === 'build') && <div className={`home-box rel ${cn.greyer}`}>
      <h3 className={cn.h3}>Building project</h3>
      Building a project is where the real work is. Running <LinkSrvSurvey /> automates the process, sending updates to Raven Colonial as you progress. Most operations can be performed through the site for those not running SrvSurvey.
      <ul>
        <li>Clicking cargo rows will reveal a menu button <Icon className="btn icon-inline" iconName='ContextMenu' style={{ color: appTheme.palette.themePrimary }} /> with more options.</li>
        <li><span style={{ color: appTheme.palette.themePrimary }}><Icon className="btn icon-inline" iconName='StatusCircleCheckmark' /> Mark Ready</span> has no specific meaning, it can be toggled on or off as you see fit. Items marked ready will show <Icon className="btn icon-inline" iconName='SkypeCircleCheck' style={{ color: appTheme.palette.themePrimary }} /></li>
        <li><span style={{ color: appTheme.palette.themePrimary }}><Icon className="btn icon-inline" iconName='Download' />Set to zero</span> is a convenience to reduce the count to zero with a single click.</li>
        <li>See below for details on <span style={{ color: appTheme.palette.themePrimary }}><Icon className="btn icon-inline" iconName='PeopleAdd' /> Assign to a commander ...</span></li>
        <li>Cargo items can be sorted by clicking <Icon className="btn icon-inline" iconName='Sort' /> and completed entries removed by <Icon className="btn icon-inline" iconName='AllAppsMirrored' style={{ color: appTheme.palette.themePrimary }} /> / <Icon className="btn icon-inline" iconName='ThumbnailViewMirrored' style={{ color: appTheme.palette.themePrimary }} /></li>
        <li>For those not running SrvSurvey, use the <span style={{ color: appTheme.palette.themePrimary }}><Icon className="btn icon-inline" iconName='DeliveryTruck' /> Deliver</span> button when delivering supplies to a construction site.</li>
        <li>Use the <Icon className="btn icon-inline" iconName='Edit' style={{ color: appTheme.palette.themePrimary }} /> edit buttons to manually change commodity values or project details.</li>
        <li>The page will auto-update every 30 seconds, until 1 hour passes without changes. Click <span style={{ color: appTheme.palette.themePrimary }}><Icon className="btn icon-inline" iconName='Refresh' /> Refresh</span> to reload data and start auto-updating again. The <Icon className="btn icon-inline" iconName='PlaybackRate1x' style={{ color: appTheme.palette.themePrimary }} /> icon means auto-updating is active.</li>
        <li>If you have multiple projects on the go, click the top <span style={{ color: appTheme.palette.themePrimary }}><Icon className="btn icon-inline" iconName='Manufacturing' /> Build</span> to see an aggregated view of all your active projects.</li>
        <li>The SrvSurvey overlay will show the same aggregated view of cargo needed across all your projects. Use the <span style={{ color: appTheme.palette.themePrimary }}><Icon className="btn icon-inline" iconName='SingleBookmarkSolid' /> Primary</span> button to set or clear your primary project. SrvSurvey will then show cargo items needed only for the primary or all projects. Be sure to click Colonize {">"} Refresh in SrvSurvey after changing this.</li>
        <li>Projects may only be deleted by the system architect.</li>
        <li>The notes field may be used to store any free form text.</li>
        <li>As you make progress, charts will update showing progress with the volume of cargo delivered each hour.</li>
        <IconBtnScrollTop />
      </ul>
    </div>}


    {(!helpId || helpId === 'groups') && <div className={`home-box rel ${cn.greyer}`}>
      <h3 className={cn.h3}>Working in groups</h3>
      Some colonization projects are huge and best done by groups of Commanders. SrvSurvey and RavenColonial will support groups working together on a single project.
      <ul>
        <li>Below project fields and notes is a list of Commanders working on a project. Linking a Commander means this project will be shown on their home page and SrvSurvey will know to track progress them.</li>
        <li>Use the <span style={{ color: appTheme.palette.themePrimary }}><Icon className="btn icon-inline" iconName='Add' /> Add</span> button to add any Commander by name. They do not need to be using SrvSurvey or RavenColonial.</li>
        <li>In the list of commodities use <span style={{ color: appTheme.palette.themePrimary }}>Assign to a commander ...</span> to tag a given commodity to a particular commander. This helps divvy up who is going to collect what.</li>
        <li>Assigned commodities will also surface in the SrvSurvey overlay, look for the 📌 icon.</li>
        <li>Tap or hover over an assignment or a Commander's name and use the <Icon className="btn icon-inline" iconName='Delete' style={{ color: appTheme.palette.themePrimary }} /> button to remove an assignment or a Commander from a project.</li>
        <li>Deliveries will naturally be tracked by commander, showing names on the charts with hourly progress.</li>
        <li>If you have a relevant Discord channel or thread, use <span style={{ color: appTheme.palette.themePrimary }}><Icon className="btn icon-inline" iconName='Edit' /> Edit Project</span> to store that link and the <span style={{ color: appTheme.palette.themePrimary }}><Icon className="btn icon-inline" iconName='OfficeChatSolid' /> Discord</span> will jump you right to it. </li>
        <IconBtnScrollTop />
        <li>If the Discord app is installed on this device, enable the setting <span style={{ color: appTheme.palette.themePrimary }}>Use native Discord links</span> to open it directly. Click <Icon className="btn icon-inline" iconName='Contact' style={{ color: appTheme.palette.themePrimary }} /> button in the top right corner to see your settings. </li>
      </ul>
    </div>}


    {(!helpId || helpId === 'fc') && <div className={`home-box rel ${cn.greyer}`}>
      <h3 className={cn.h3}>Working with Fleet Carriers</h3>
      Small or large, using a Fleet Carrier is an essential way to speed up building colonies. SrvSurvey and Raven Colonial support this by linking Fleet Carriers to specific projects or Commanders.
      <ul>
        <li>The simplest way to add your personal and squadron Fleet Carriers is to use <span style={{ color: appTheme.palette.themePrimary }}><Icon className="btn icon-inline" iconName='AuthenticatorApp' /> Login</span> from the button top/right, then hit the <span style={{ color: appTheme.palette.themePrimary }}><Icon className="btn icon-inline" iconName='Refresh' /> My FC</span> button. This will pull their cargo contents too.</li>
        <li>Other Fleet Carriers can be added using the <span style={{ color: appTheme.palette.themePrimary }}><Icon className="btn icon-inline" iconName='Add' /> Add</span> button next to "Fleet Carriers". Searching is by by name queried from <LinkSrvSurvey href='https://spansh.co.uk' text='Spansh' title='spansh.co.uk' />, though it is common for display names not to be known. If not found by name: use their 6 digit ID code, eg: <code>N3M-T4R</code>, or 4 digit squadron tag.</li>
        <li>You can edit cargo amounts and the display name used by Raven Colonial by clicking the <Icon className="btn icon-inline" iconName='Edit' style={{ color: appTheme.palette.themePrimary }} /> button, or unlink from a project by <Icon className="btn icon-inline" iconName='Delete' style={{ color: appTheme.palette.themePrimary }} /></li>
        <li>SrvSurvey will automatically track items bought, sold or transferred to any linked Fleet Carrier. When docked it will update with amounts of items for sale in the market place. You can also update cargo counts manually as needed via the <Icon className="btn icon-inline" iconName='Edit' style={{ color: appTheme.palette.themePrimary }} /> button.</li>
        <li>For those not running SrvSurvey, the <span style={{ color: appTheme.palette.themePrimary }}><Icon className="btn icon-inline" iconName='DeliveryTruck' /> Deliver</span> button can also be used to capture cargo delivered to a linked Fleet Carrier.</li>
        <li>Each linked Fleet Carrier has their own column in the table of commodities, along with a column showing the sum difference between all carriers and the amount needed. An <Icon className="btn icon-inline" iconName='fleetCarrierSolid' /> icon will be shown when there is enough cargo on Fleet Carriers.</li>
        <li>Fleet Carriers can be linked directly to Commanders by 2 ways: toggle the <Icon className="btn icon-inline" iconName='UserFollowed' style={{ color: appTheme.palette.themePrimary }} /> / <Icon className="btn icon-inline" iconName='UserRemove' style={{ color: appTheme.palette.themePrimary }} /> button when editing a Fleet Carrier. Or add/remove from the list in your settings, see <Icon className="btn icon-inline" iconName='Contact' style={{ color: appTheme.palette.themePrimary }} /> in the top right corner.</li>
        <li>Linking Fleet Carriers to your Commander helps as they will be added to the dropdown when when picking Fleet Carriers on future Projects.</li>
        <IconBtnScrollTop />
      </ul>
    </div>}


    {(!helpId || helpId === 'markets') && <div className={`home-box rel ${cn.greyer}`}>
      <h3 className={cn.h3}>Finding markets</h3>
      Minimizing trips and distance travelled is key to completing constructions quickly. Use the <Icon iconName='ShoppingCart' className='icon-inline' style={{ color: appTheme.palette.themePrimary }} /> button above the commodities table to find markets near your construction site with the required supplies.
      <ul>
        <li>Start with criteria to fit your needs: excluding markets too far, wrong landing pad size, etc.</li>
        <li>The tool will search for the 5 closest markets for each commodity, then presents them in a combined interactive list.</li>
        <li>The list can be sorted by any column, defaulting to highest count of matched commodities. There is a lot of information on each row that can be seen by hovering the mouse in different places.</li>
        <li>Click the <Icon className="btn icon-inline" iconName='DoubleChevronLeft' style={{ color: appTheme.palette.themePrimary }} /> button top right to make the list bigger.</li>
        <li>Expand any row to see the relevant commodities available at that market.</li>
        <li>Click any commodity bubble to highlight it, which will higlight any other markets with that commodity.</li>
        <li>Commodities with insuffient quantities at a market will be dimmer but are still clickable.</li>
        <li>Toggle <span style={{ color: appTheme.palette.themePrimary }}>Expand highlights</span> to auto expand any market row containing any of the highlighted commodities.</li>
        <li>Toggle <span style={{ color: appTheme.palette.themePrimary }}>Only highlights</span> to only show markets that contain any highlighted commodity.</li>
        <li>Toggle <span style={{ color: appTheme.palette.themePrimary }}>FC Diff</span> to reduce commodities already loaded onto linked Fleet Carriers.</li>
        <li>Tap the system name to view the market in Inara.</li>
        <li>The bar at the bottom shows an approximate view of how highlighted commodities would fit in your ships cargo hold.</li>
        <IconBtnScrollTop />
      </ul>
    </div>}
  </>;
};

const IconBtnScrollTop: React.FunctionComponent = () => <IconButton
  style={{ position: 'absolute', bottom: 8, right: 8 }}
  iconProps={{ iconName: 'DoubleChevronUp12' }}
  onClick={() => window.scrollTo({ top: 0 })}
/>;
