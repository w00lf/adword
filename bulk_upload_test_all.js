function main() {
  var bulkSpreadsheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1CooB3yyF-2JvMCQMWjzZ4kSV--rR6ztKIMikLtv3KqQ/edit");
  var bulkValues = bulkSpreadsheet.getDataRange().getValues();
  var headers = bulkValues.shift();
  uploadRange(headers.slice(0,5), bulkValues, 0, 5);
  uploadRange(headers.slice(5,7), bulkValues, 5, 7);
}

function uploadRange(headers, rows, start, end) {
  var upload = AdWordsApp.bulkUploads().newCsvUpload(headers);
  upload.forCampaignManagement();

  for(var i in rows) {
    var row = rows[i].slice(start, end);
    Logger.log(row)
    var uploadObject = {};
    for(var j in headers) {
      uploadObject[headers[j]] = row[j]
    }
    Logger.info(uploadObject);
    upload.append(uploadObject);
  }
  upload.apply();
}