function main() {
  var reportData = getReportData();
  var columns = [
    'Date',
    'Client Account',
    'Campaign ID',
    'Campaign Currency',
    'Campaign Name',
    'Campaign Type',
    'Daily Budget',
    'Impression',
    'Clicks',
    'CTR',
    'Avg.CPC',
    'Cost',
    'Conversions',
    'Cost / conv.'
  ];
  var accountSpreadsheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1zPzf7Pu5xH_DuWVeSdFZIMffEk8J8BVwjejhablGZks/edit");
  accountSpreadsheet.setSpreadsheetTimeZone(AdWordsApp.currentAccount().getTimeZone());
  appendToSpreadsheetReport(accountSpreadsheet, columns, reportData);
}

function appendToSpreadsheetReport(spreadsheet, headers, rows) {
  var values = spreadsheet.getSheetValues(1, 1, 1, 1);
  if (!values[0][0]) {
    spreadsheet.appendRow(headers);
  }
  for (i in rows) {
    spreadsheet.appendRow(rows[i]);
  }
}

function getReportData() {
  var millis_per_day = 1000 * 60 * 60 * 24;
  var now = new Date();
  var yesterday = new Date(now.getTime() - millis_per_day);
  var result = [];
  var accountName = AdWordsApp.currentAccount().getName();
  var currencyCode = AdWordsApp.currentAccount().getCurrencyCode();
  var reportDateString = Utilities.formatDate(yesterday, 'Europe/Moscow', 'd/M/yyyy');
  Logger.log(yesterday);
  Logger.log(Utilities.formatDate(yesterday, 'Europe/Moscow', 'd/M/yyyy HH:mm:ss'));
  Logger.log(reportDateString);

  var report = AdWordsApp.report("SELECT CampaignId, CampaignName, AdvertisingChannelType, Amount, Impressions, Clicks, Ctr, AverageCpc, Cost, Conversions " +
    "FROM CAMPAIGN_PERFORMANCE_REPORT " +
    "DURING YESTERDAY").rows();
  while (report.hasNext()) {
    var row = report.next();
    var intermidateResult = [
      reportDateString,
      accountName,
      row['CampaignId'],
      currencyCode,
      row['CampaignName'],
      row['AdvertisingChannelType'],
      row['Amount'],
      row['Impressions'],
      row['Clicks'],
      row['Ctr'],
      row['AverageCpc'],
      row['Cost'],
      row['Conversions'],
      row['Cost'] / row['Conversions']
    ];
    result.push(intermidateResult);
  }
  Logger.log(result);
  return result
}