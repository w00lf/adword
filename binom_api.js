function main() {
  var binomApiKey = '';
  var dateNow = new Date();
  var yesterday = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate() - 1);
  var reportDateString = formatDate(yesterday);

  var mergedReportAccount = SpreadsheetApp.getActive();

  var reportSheet = mergedReportAccount.getSheetByName("Report");
  var reportRange = reportSheet.getDataRange();
  var reportValues = reportRange.getValues();

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
      Logger.log(rowValue[11]);
      if (typeof rowValue[11] == 'number') {
        result[binomCampaigns[rowValue[2]]] += modificator * rowValue[11];
      } else {
        result[binomCampaigns[rowValue[2]]] += modificator * Number(rowValue[11].match(/\d+/)[0]);
      }
    }
  }
  for (comp_id in result) {
    var resultValue = result[comp_id];
    sendToBinomApi(comp_id, binomApiKey, resultValue);
  }
}

function formatDate(date) {
  return Utilities.formatDate(date, 'Asia/Jerusalem', 'd/M/yyyy');
}

function sendToBinomApi(binomCampId, apiKey, cost) {
  var binomApiUrl = '' + '?page=save_update_costs&camp_id=' + binomCampId + '&type=1&date=2&timezone=3&cost=' + cost.toFixed(2) + '&value=' + cost.toFixed(2) + '&api_key=' + apiKey;
  Logger.log('Sending info to binom api: ' + binomApiUrl);
  var response = UrlFetchApp.fetch(binomApiUrl);
  Logger.log(response.getContentText());
}