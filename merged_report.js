function main() {
  var dateNow = new Date();
  var yesterday = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate() - 1);
  var reportDateString = formatDate(yesterday);
  var result = [];
  var mergedAccountSpreadsheet = SpreadsheetApp.openByUrl("")
  var mergedReportAccount = mergedAccountSpreadsheet.getSheetByName("Report");
  var currencyReportSheet = mergedAccountSpreadsheet.getSheetByName("CurrencyRates");
  if (!currencyReportSheet) currencyReportSheet = mergedAccountSpreadsheet.insertSheet("CurrencyRates");
  var accountSpreadsheet = SpreadsheetApp.getActive();
  var sheet = accountSpreadsheet.getSheets()[0];
  var range = sheet.getDataRange();
  var values = range.getValues();
  var encounteredCurrencies = {};
  var currenciesValues = currencyReportSheet.getDataRange().getValues();
  for (i in currenciesValues) {
    encounteredCurrencies[currenciesValues[i][0]] = true
  }

  for (i in values) {
    var rowValue = values[i];
    if (rowValue[0] == reportDateString || (typeof rowValue[0].getMonth == 'function' && formatDate(rowValue[0]) == reportDateString)) {
      if (typeof rowValue[0].getMonth == 'function')
        rowValue[0] = formatDate(rowValue[0]);
      result.push(rowValue)
      if (!encounteredCurrencies[rowValue[3]]) {
        currencyReportSheet.appendRow([rowValue[3], '=GoogleFinance("' + rowValue[3] + 'USD ")'])
        encounteredCurrencies[rowValue[3]] = true;
      }
      mergedReportAccount.appendRow(rowValue);
    }
  }
  Logger.log(result);
}

function formatDate(date) {
  return Utilities.formatDate(date, 'Asia/Jerusalem', 'd/M/yyyy');
}