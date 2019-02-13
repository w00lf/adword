function main() {
  var millis_per_day = 1000 * 60 * 60 * 24;
  var now = new Date();
  var yesterday = new Date(now.getTime() - millis_per_day);
  var reportDateString = formatDate(yesterday);
  var result = [];
  var mergedAccountSpreadsheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1A12ZJGGsuQX_5s1R-plxFZVB58vYb1ITTC-Y3udsCAc/edit")
  var mergedReportAccount = mergedAccountSpreadsheet.getSheetByName("Report");
  var currencyReportSheet = mergedAccountSpreadsheet.getSheetByName("CurrencyRates");
  if (!currencyReportSheet) currencyReportSheet = mergedAccountSpreadsheet.insertSheet("CurrencyRates");
  var accountSpreadsheet = SpreadsheetApp.getActive();
  var sheet = accountSpreadsheet.getSheets()[0];
  var range = sheet.getDataRange();
  var values = range.getDisplayValues();
  var encounteredCurrencies = {};
  var currenciesValues = currencyReportSheet.getDataRange().getValues();
  for (i in currenciesValues) {
    encounteredCurrencies[currenciesValues[i][0]] = true
  }

  for (i in values) {
    var rowValue = values[i];
    Logger.log(rowValue[0]);
    Logger.log(typeof rowValue[0].getMonth);
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
  Logger.log(yesterday);
  Logger.log(Utilities.formatDate(yesterday, 'Europe/Moscow', 'd/M/yyyy HH:mm:ss'));
  Logger.log(reportDateString);
  Logger.log(result);
}

function formatDate(date) {
  return Utilities.formatDate(date, 'Europe/Moscow', 'd/M/yyyy');
}