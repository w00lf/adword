function main() {
  var binomApiKey = '8000001b938c7ae6270583a610eab942e4c7897';
  var millis_per_day = 1000 * 60 * 60 * 24;
  var now = new Date();
  var yesterday = new Date(now.getTime() - millis_per_day);
  var reportDateString = formatDate(yesterday);

  var mergedReportAccount = SpreadsheetApp.getActive();

  var reportSheet = mergedReportAccount.getSheetByName("Report");
  var reportRange = reportSheet.getDataRange();
  var reportValues = reportRange.getDisplayValues();

  var binomSheet = mergedReportAccount.getSheetByName("BinomApi");
  var binomRange = binomSheet.getDataRange();
  var binomCampaigns = {};
  var binomApiValues = binomRange.getValues();

  var currencyReportSheet = mergedReportAccount.getSheetByName("CurrencyRates");
  var currenciesValues = currencyReportSheet.getDataRange().getValues();
  var currenciesRates = {}
  for (i in currenciesValues) {
    var curencyRow = currenciesValues[i];
    currenciesRates[curencyRow[0]] = curencyRow[1]
  }

  for (i in binomApiValues) {
    var binomRow = binomApiValues[i];
    binomCampaigns[binomRow[1]] = binomRow[2];
  }

  var result = {};

  for (i in reportValues) {
    var rowValue = reportValues[i];
    if (rowValue[0] == reportDateString || (typeof rowValue[0].getMonth == 'function' && formatDate(rowValue[0]) == reportDateString)) {
      if (!binomCampaigns[rowValue[2]]) {
        Logger.log("Continued")
        continue;
      };
      if (!result[binomCampaigns[rowValue[2]]]) {
        result[binomCampaigns[rowValue[2]]] = 0;
      }
      var modificator = 1;
      if (rowValue[3] != 'USD') modificator = currenciesRates[rowValue[3]];
      Logger.log('Original value is:');
      Logger.log(rowValue[11]);
      var strValue = '' + rowValue[11];
      Logger.log('String value is:');
      Logger.log(strValue);
      var parsedStrValue = Number(strValue.replace(/[^\d\.]/g, '').match(/\d+\.?\d*/)[0]);
      Logger.log('Parsed from str value:');
      Logger.log(parsedStrValue);
      result[binomCampaigns[rowValue[2]]] += modificator * parsedStrValue;
      Logger.log('After modificator value:');
      Logger.log(result[binomCampaigns[rowValue[2]]]);
    }
  }
  for (comp_id in result) {
    var resultValue = result[comp_id];
    sendToBinomApi(comp_id, binomApiKey, resultValue);
  }
  Logger.log(yesterday);
  Logger.log(Utilities.formatDate(yesterday, 'Europe/Moscow', 'd/M/yyyy HH:mm:ss'));
  Logger.log(reportDateString);
}

function formatDate(date) {
  return Utilities.formatDate(date, 'Europe/Moscow', 'd/M/yyyy');
}

function sendToBinomApi(binomCampId, apiKey, cost) {
  var binomApiUrl = 'https://trkprofit.com' + '?page=save_update_costs&camp_id=' + binomCampId + '&type=1&date=2&timezone=3&cost=' + cost.toFixed(2) + '&value=' + cost.toFixed(2) + '&api_key=' + apiKey;
  Logger.log('Sending info to binom api: ' + binomApiUrl);
  var response = UrlFetchApp.fetch(binomApiUrl);
  Logger.log(response.getContentText());
}