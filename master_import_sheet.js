function main() {
  var masterAccountSpreadsheet = SpreadsheetApp.getActive();
  var sheetsListData = masterAccountSpreadsheet.getSheetByName("Account sheets").getDataRange().getDisplayValues();
  var accountSpreadsheets = {};
  sheetsListData.shift();
  for (var i in sheetsListData) {
    var row = sheetsListData[i];
    accountSpreadsheets[row[0]] = SpreadsheetApp.openByUrl(row[1]);
  }
  Logger.log(accountSpreadsheets);

  var importDataSheet = masterAccountSpreadsheet.getSheetByName("Import data");
  var range = importDataSheet.getDataRange();
  var reportValues = range.getDisplayValues();
  var headers = reportValues.shift();
  for (i in reportValues) {
    var rowValue = reportValues[i];
    Logger.log(rowValue[0]);
    Logger.log(rowValue[1]);
    if (rowValue[0] == 'ready') {
      var accountName = rowValue[1];
      var index = Number(i) + 2;
      var cell = masterAccountSpreadsheet.getRange("A" + index);
      var accountSpread = accountSpreadsheets[accountName];
      if (!accountSpread) {
        cell.setValue('error');
        continue;
      }
      var values = accountSpread.getSheetValues(1, 1, 1, 1);
      if (!values[0][0]) {
        accountSpread.appendRow(["Custom Status"].concat(headers.slice(2)));
      }
      accountSpread.appendRow(["ready"].concat(rowValue.slice(2)));
      cell.setValue('done');
    }
  }
}