export const About: React.FunctionComponent = () => {
  window.document.title = `About Raven Colonial Corporation`;

  return <>
    <div className="hint" style={{ padding: '8px' }}>
      <br />
      From the earliest times in history, mankind has looked to expand. We have sought to explore and thrive.  From the old earth Abrahamic religions, we were told to "go forth, and multiply."  This was the task given to Noah in the days after the dove returned with signs of land. Go forth, and Multiply.
      <br /><br />
      But it wasn't a dove, over the years the translation was lost, in the original story it was a raven.
      <br /><br />
      Now, thousands of years later, Raven Colonial Corporation wishes to continue that millenias old command.
      <br /><br />
      Go forth, and Multiply.
      <br /><br />

      <h3>About SrvSurvey</h3>
      <br />
      Learn more on the <a href='https://github.com/njthomson/SrvSurvey/wiki' target="_blank">SrvSurvey wiki</a>. Issues can be <a href='https://github.com/njthomson/SrvSurvey/issues' target='_blank'>reported here</a> and general discussion happens through <a href='https://discord.gg/nEWMqZNBdy' target='_blank'>Discord</a>.
      <br />
      <br />
      Latest builds can be found on <a href="https://github.com/njthomson/SrvSurvey/releases/">GitHub releases</a>.
      <br />
      <br />
      SrvSurvey can also be installed via the <a href='https://www.microsoft.com/store/productId/9NGT6RRH6B7N' target='_blank'>Windows App Store</a>, but this does not yet contain colonization features.
    </div>
  </>;
};
