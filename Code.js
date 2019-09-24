var tab_count = "Unknown";

function doGet() {
  folderName = getStatementsFolder().getName();

  blahblah = myFunction(); // in Something.gs
  
  return HtmlService.createTemplateFromFile('index').evaluate();
}

function loadSheet() {
  sheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1rhLN-Ejv15slEsVC6NTPFgCFGtQDplpsvEnAdiZDB9E/edit#gid=586329531");
  return sheet.getNumSheets();
}

function loadChart() {
  return [
    ['Mushrooms', 3],
    ['Onions', 1],
    ['Olives', 1],
    ['Zucchini', 1],
    ['Pepperoni', 2]
  ]
}

function getStatus() {
  var d = new Date();
  return [d.toString(), 2500];
}

function getStatementsFolder() {
  folderName = PropertiesService.getScriptProperties().getProperty("StatementsFolder");
  Logger.log("Looking for StatementsFolder named: " + folderName);
  folders = DriveApp.getFoldersByName(folderName);
  while (folders.hasNext()) {
    var folder = folders.next();
    Logger.log("StatementsFolder: " + folder.getName() + "; ID=" + folder.getId());
    return folder;
  }
  Logger.log("No StatementsFolder found!");
  return null;
}


function uploadFile(e) {
  Logger.log("Uploading file!");
  var dfolder = getStatementsFolder();
  Logger.log("Filename: " + e.theFile.getName());
  var folderId = dfolder.getId();
  var blob = e.theFile; // Blob class
  var filename = blob.getName();
  var mimeType = blob.getContentType();
  Logger.log("Creating Google Sheet");
  return convertExcel2Sheets(blob, filename, mimeType, [folderId]).getName();
}


/**
 * Convert Excel file to Sheets
 * @param {Blob} excelFile The Excel file blob data; Required
 * @param {String} filename File name on uploading drive; Required
 * @param {Array} arrParents Array of folder ids to put converted file in; Optional, will default to Drive root folder
 * @param {MimeType} mimeType The MIME type of the blob.
 * @return {Spreadsheet} Converted Google Spreadsheet instance
 **/
function convertExcel2Sheets(excelFile, filename, mimeType, arrParents) {
  
  var parents = arrParents;
  if (!arrParents || arrParents.constructor !== Array) {
    Logger.log("Defaulting to root folder");
    parents = [];
  }
  
  // Parameters for Drive API Simple Upload request (see https://developers.google.com/drive/web/manage-uploads#simple)
  var uploadParams = {
    method:'post',
    contentType: 'application/vnd.ms-excel', // works for both .xls and .xlsx files
    contentLength: excelFile.getBytes().length,
    headers: {'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()},
    payload: excelFile.getBytes()
  };
  
  if (mimeType == MimeType.CSV) {
    Logger.log("Setting MIME type to text/csv");
    uploadParams.contentType = 'text/csv';
  }
  
  // Upload file to Drive root folder and convert to Sheets
  var uploadResponse = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v2/files/?uploadType=media&convert=true', uploadParams);
    
  // Parse upload&convert response data (need this to be able to get id of converted sheet)
  var fileDataResponse = JSON.parse(uploadResponse.getContentText());

  // Create payload (body) data for updating converted file's name and parent folder(s)
  var payloadData = {
    title: filename, 
    parents: []
  };
  if ( parents.length ) { // Add provided parent folder(s) id(s) to payloadData, if any
    for ( var i=0; i<parents.length; i++ ) {
      try {
        var folder = DriveApp.getFolderById(parents[i]); // check that this folder id exists in drive and user can write to it
        payloadData.parents.push({id: parents[i]});
      }
      catch(e){} // fail silently if no such folder id exists in Drive
    }
  }
  // Parameters for Drive API File Update request (see https://developers.google.com/drive/v2/reference/files/update)
  var updateParams = {
    method:'put',
    headers: {'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()},
    contentType: 'application/json',
    payload: JSON.stringify(payloadData)
  };
  
  // Update metadata (filename and parent folder(s)) of converted sheet
  UrlFetchApp.fetch('https://www.googleapis.com/drive/v2/files/'+fileDataResponse.id, updateParams);
  
  return SpreadsheetApp.openById(fileDataResponse.id);
}
