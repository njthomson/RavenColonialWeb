import { DefaultButton, Icon, IconButton, Link, Stack } from "@fluentui/react";
import { LinkSrvSurvey } from "../components/LinkSrvSurvey";

export const learnAbout = (currentHelpId?: string) => {

  const showHelp = (helpId: string) => {
    if (helpId !== currentHelpId) {
      window.location.hash = `#about=${helpId}`;
    } else {
      window.location.hash = `#about`;
    }
  };

  const topics: Record<string, string> = {
    raven: 'Raven Colonial',
    find: 'Find a project',
    create: 'Creating a project',
    build: 'Building a project',
    groups: 'Working in groups',
    fc: 'Linking Fleet Carriers',
    srvsurvey: 'SrvSurvey',
  }

  return <div className='home-box'>
    <h3>Learn more about:</h3>
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


    {(!helpId || helpId === 'raven') && <div className='home-box'>
      <h3>The Raven Colonial Corporation</h3>
      From the earliest times in history, mankind has looked to expand. We have sought to explore and thrive.  From the old earth Abrahamic religions, we were told to "go forth, and multiply."  This was the task given to Noah in the days after the dove returned with signs of land. Go forth, and Multiply.
      <br />
      But it wasn't a dove, over the years the translation was lost, in the original story it was a raven.
      <br />
      Now, thousands of years later, the Raven Colonial Corporation wishes to continue that millenias old command.
      <br /><br />
      Go forth, and Multiply.
      <br />
      <ul>
        <li>The Raven Colonial Corporation supports colonization efforts whether working solo in groups or using Fleet Carriers.</li>
        <li>Using SrvSurvey to monitor local journal file changes, progress will be tracked automatically as you conduct your affairs.</li>
        <li>Use the <Icon className="btn icon-inline" iconName='UserWarning' /> / <Icon className="btn icon-inline" iconName='Contact' /> button in the top right corner to set your Commander name and the cargo hold sizes for your commonly used ship. See below about linking Fleet Carriers.</li>
        <IconBtnScrollTop />
      </ul>
    </div>}


    {(!helpId || helpId === 'srvsurvey') && <div className='home-box'>
      <h3>About SrvSurvey</h3>
      Issues can be <LinkSrvSurvey href='https://github.com/njthomson/SrvSurvey/issues' text='reported here' title='Submit suggestions and bug reports' /> and general discussion happens through <LinkSrvSurvey href='https://discord.gg/nEWMqZNBdy' text="Discord" title='Discuss SrvSurvey' />.
      <ul>
        <li>See more detailed guidance on the <LinkSrvSurvey text='SrvSurvey colonization wiki' />.</li>
        <li>Latest builds can be found on <LinkSrvSurvey href='https://github.com/njthomson/SrvSurvey/releases/' text='GitHub releases' title='GitHub releases - frequently updated' />.</li>
        <li>Use the big Colonize button on the main window enable Colonization features and to create new projects.</li>
        <li>Once enabled cargo tracking will happen automatically at construction sites and linked Fleet Carriers.</li>
        <li>Use the Colonize {">"} Refresh button after changing links or assignments on the web site. (Coming soon) use this button to set a periodic refresh.</li>
      </ul>
      SrvSurvey can also be installed via the <LinkSrvSurvey href='https://www.microsoft.com/store/productId/9NGT6RRH6B7N' text='Windows App Store' title='Windows App Store - infrequently updated' /> but this does not yet support colonization features.
      <IconBtnScrollTop />
    </div>}


    {(!helpId || helpId === 'find') && <div className='home-box'>
      <h3>Finding a project</h3>
      <ul>
        <li>The home page will show any project your Commander is linked to, active or completed, as well as the last 5 projects you have viewed.</li>
        <li>Projects can be found by the system name on <Link href='#find'>#find</Link> page.</li>
        <li>(coming soon) It will also be possible to find Projects near a given system.</li>
        <IconBtnScrollTop />
      </ul>
    </div >}


    {(!helpId || helpId === 'create') && <div className='home-box'>
      <h3>Creating a project</h3>
      <ul>
        <li>Creating projects is best done through <LinkSrvSurvey /> as it can pre-populate required cargo as well as other details pulled from journal files.</li>
        <li>It is also possible to create projects through this site, though it requires some manual data entry.</li>
        <li>Start entering the system name on the <Link href='#find'>#find</Link> page.</li>
        <li>Assuming no match is found, click `Search sites` to pull any construction sites. (This information comes from EDSM)</li>
        <li>Choose or if the desired construction site is not known, you will have to manually find the marketID value in journal files. Click the <Icon className="icon-inline" iconName="Info" /> button for instructions.</li>
        <li>Enter a name and choose the project type. Eg: Vulcan, Coriolis, Chronos, etc. You can find this information when docked at the construction site.</li>
        <li>After creating the site, you will need to manually enter cargo amounts. Or visit the site with SrvSurvey running and these numbers will be populated automatically.</li>
        <IconBtnScrollTop />
      </ul>
    </div>}


    {(!helpId || helpId === 'build') && <div className='home-box'>
      <h3>Building project</h3>
      Building a project is where the real work is. Running <LinkSrvSurvey /> automates the process, sending updates to Raven Colonial as you progress. Most operations can be performed through the site for those not running SrvSurvey.
      <ul>
        <li>Clicking cargo rows will reveal a menu button <Icon className="btn icon-inline" iconName='ContextMenu' /> with more options.</li>
        <li>"Mark Ready" has no specific meaning, it can be toggled on or off as you see fit. Items marked ready will show <Icon className="btn icon-inline" iconName='SkypeCircleCheck' /></li>
        <li>"Set to zero" is a convenience to reduce the count to zero with a single click.</li>
        <li>See below for details on "Assign to a commander ..."</li>
        <li>Cargo items can be sorted by clicking <Icon className="btn icon-inline" iconName='Sort' /> and completed entries removed by <Icon className="btn icon-inline" iconName='AllAppsMirrored' /></li>
        <li>For those not running SrvSurvey, use the <Icon className="btn icon-inline" iconName='DeliveryTruck' /> deliver button when delivering supplies to a construction site.</li>
        <li>Use the <Icon className="btn icon-inline" iconName='Edit' /> edit buttons to manually change commodity values or project details.</li>
        <li>Use the <Icon className="btn icon-inline" iconName='Refresh' /> to reload all project related data. (Coming soon) use this button to set a periodic refresh.</li>
        <li>If you have multiple projects on the go, the SrvSurvey overlay will show the sum of all cargo items needed across all your projects. Use the <Icon className="btn icon-inline" iconName='SingleBookmarkSolid' /> button to mark one as primary, then SrvSurvey will show cargo items needed for just that project. Be sure to click Colonize {">"} Refresh in SrvSurvey after changing this.</li>
        <li>Projects may only be deleted by the system architect.</li>
        <li>The notes field may be used to store any free form text.</li>
        <li>As you make progress, charts will update showing progress with the volume of cargo delivered each hour.</li>
        <IconBtnScrollTop />
      </ul>
    </div>}


    {(!helpId || helpId === 'groups') && <div className='home-box'>
      <h3>Working in groups</h3>
      Some colonization projects are huge and best done by groups of Commanders. SrvSurvey and RavenColonial will support groups working together on a single project.
      <ul>
        <li>Below project fields and notes is a list of Commanders working on a project. The project will automatically show for all linked Commanders.</li>
        <li>Use the <Icon className="btn icon-inline" iconName='AddFriend' /> button to add any Commander by name. They do not need to be using SrvSurvey or RavenColonial.</li>
        <li>"Assign to a commander ..." can be used to assign a given commodity to a particular commander. This helps divvy up who is going to collect what. Your Commander will be highlighted in light blue.</li>
        <li>Assigned commodities will also surface in the SrvSurvey overlay, look for the 📌 icon.</li>
        <li>Hover over an assignment or a Commander's name and use the <Icon className="btn icon-inline" iconName='Delete' /> button to remove an assignment, or a Commander from this project. This will also remove any commodity assignments they may have.</li>
        <li>Deliveries will naturally be tracked by commander, showing names on the charts with hourly progress.</li>
        <IconBtnScrollTop />
      </ul>
    </div>}


    {(!helpId || helpId === 'fc') && <div className='home-box'>
      <h3>Working with Fleet Carriers</h3>
      Small or large, using a Fleet Carrier is an essential way to speed up building colonies. SrvSurvey and Raven Colonial support this by linking Fleet Carries to specific projects or Commanders.
      <ul>
        <li>Use the <Icon className="btn icon-inline" iconName='Airplane' /> button below linked Commanders to add a Fleet Carrier, searching for them by name. Names are queried from Spansh and it is common for display names not to be known. Use their 6 digit ID code if not found by their display name.</li>
        <li>You can edit cargo counts and the display name used by Raven Colonial by clicking the <Icon className="btn icon-inline" iconName='Edit' /> button, or unlink by <Icon className="btn icon-inline" iconName='Delete' /></li>
        <li>SrvSurvey will automatically track items bought, sold or transferred to any linked Fleet Carrier. Currently this tracking is relative, meaning it will not initially know what items are present, but you can manually update cargo counts as needed.</li>
        <li>For those not running SrvSurvey, the "<Icon className="btn icon-inline" iconName='DeliveryTruck' /> Deliver" button can also be used to capture cargo delivered to a linked Fleet Carrier.</li>
        <li>Each linked Fleet Carriers will have their own column in the table of commodities, along with a column showing the difference between all carries and the amount needed. An <Icon className="btn icon-inline" iconName='AirplaneSolid' /> icon will be shown when there is enough cargo on Fleet Carriers</li>
        <li>Fleet Carriers can be linked directly to Commanders by 2 ways: toggle the <Icon className="btn icon-inline" iconName='UserFollowed' /> / <Icon className="btn icon-inline" iconName='UserRemove' /> button when editing a Fleet Carrier. Or: add/remove from the list when editing your own Commander via <Icon className="btn icon-inline" iconName='Contact' /> in the top right corner.</li>
        <IconBtnScrollTop />
      </ul>
    </div>}

  </>;
};

const IconBtnScrollTop: React.FunctionComponent = () => <IconButton
  className="right"
  style={{ position: 'relative', top: -8 }}
  iconProps={{ iconName: 'DoubleChevronUp12' }}
  onClick={() => window.scrollTo({ top: 0 })}
/>;
