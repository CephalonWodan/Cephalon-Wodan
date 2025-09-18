import WikiaDataScraper from '../WikiaDataScraper.mjs';
import transformWarframe from '../transformers/transformWarframe.mjs';

// On passe juste le titre du module ; la base construit RAW/EXPORT/EDIT
export default class WarframesModuleScraper extends WikiaDataScraper {
  constructor() {
    super('Module:Warframes/data', 'Warframes', transformWarframe);
  }
}