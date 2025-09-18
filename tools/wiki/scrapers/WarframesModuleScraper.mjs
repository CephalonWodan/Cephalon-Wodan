import WikiaDataScraper from '../WikiaDataScraper.mjs';
import transformWarframeLite from '../transformers/transformWarframeLite.mjs';

export default class WarframesModuleScraper extends WikiaDataScraper {
  constructor() {
    // Priorité action=edit (WFCD-style), avec fallbacks gérés par la base
    super('https://wiki.warframe.com/w/Module:Warframes/data?action=edit',
          'Warframes',
          transformWarframeLite);
  }
}
