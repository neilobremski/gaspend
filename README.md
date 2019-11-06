# gaspend
_Spend Tracking Web Application written with Google Apps Script_

The idea behind this is you want to track your spending habits using a few simple graphs and tables. All of your transactions are saved in a single Google Sheet "journal". Upload CSVs and Excel spreadsheets from your banks, credit card companies, etc. into this app and they get translated into canonical journal entries. The data is saved to your Google Drive so that you have complete control over it. Sharing data between users is the same as sharing the same journal and statements folder.

What makes GAS an interesting platform is how tightly integrated it is with the "Google Universe". So for things that deal with Google Docs, Sheets, etc. it is a natural fit. It doesn't work so well for external API's and there is no control over the URLs. I'll be curious to see if I can get this into working order enough to submit it to Google's publishing platform for apps.

## Installation

TODO

## Milestones

### Milestone 1: Configuration

The App loads its configuration information from a Google Sheet with tabs specific to different parts of categorization. For this milestone, only a General tab will exist which has the following settings:

  * Title: What to display as page/app Title

The URL of the configuration sheet will be specified as a GAS application variable.

### Milestone 2: Import

A file upload element is on the page which is used so that account statements can be uploaded and processed. Each record identified as a _spend_ [1] is converted into such an object and added to the spends journal. A status line element is on the bottom of the page which indicates what the server is currently doing, such as its progress in importing the statement.

  * Duplicate spends are ignored.

[1] Bank transfers and deposits are _not_ spends.

### Milestone 3: View Details

The App can list, sort, and filter the spends journal. This will likely use Google's data table "chart".

### Milestone 4: Categorization

Spends can be categorized and this can be used to further sort and filter the detailed listing output. Filters are specified using a tab on the configuration sheet.

### Milestone 5: View Charts

Pie charts summarize the details using the categories. Clicking on a pie slice will filter the detail listing by that category and a second pie chart will represent each item of that filtered listing. Finally, clicking on one of those detail pie slices will locate and highlight the record of that spend.

### Milestone 6: Prettify

The UI is made to look pleasing with graphics and CSS. App can host graphics on Google Drive.

Elements:

  * Min - Max Month
  * Category Chart
  * Source Chart / Detail Chart
  * Upload Element
  * Page Title: "Spend Tracker"
  * Status Bar

## Notes

### Upload CSV to Google Drive

Uploading via GAS is done through JavaScript because there's no URLs in a GAS app. This also means that the rest of the app is going to have to be dynamic and not use URLs either.

Here's the main SO question I referenced: https://stackoverflow.com/questions/15670392/uploading-file-using-google-apps-script-using-htmlservice

To make it complete, I'd want to add an error handler as well. On the server side I did this:

```javascript
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
  return dfolder.createFile(e.theFile).getName();
}
```

### Convert CSV to Google Sheet

This is a bit more complicated. The answer I was given on StackOverflow uses the REST API which I need to call through `UrlFetch` (boo!). Here's a GitHub example I'm going to try now:

https://gist.github.com/azadisaryev/ab57e95096203edc2741

--

Success: https://stackoverflow.com/questions/56942273/upload-csv-excel-file-as-sheet-via-google-app-script

```javascript
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
```

### Upload/Convert XLS

The same code for CSV worked with XLSX (and presumably XLS)!

### Generate Charts

I can either generate an image and return it inline from the server or I can do it client-side in JavaScript using the Charts API. I think the latter is the best option because the charts are a bit more interactive. The challenge will be passing the data between the server and client but I believe I can use google.script.run to do that.

https://developers.google.com/apps-script/guides/html/reference/run

### Link Pie Chart Slices

It's kind of brutal to do this but you can do it. Basically you call `google.visualization.events.addListener(chart, 'select', selectHandler);` and then in `selectHandler()` you call `getSelection()` which returns an array of selections. You get the first of these (since it's just a pie chart) and it will be an object ostensibly with column and row indices. However, since it's a PieChart it only has row. And so finally you map that back to the row in the source data and blam, you know what to do ... whew

https://developers.google.com/chart/interactive/docs/gallery/piechart#Events

### Data Table / Grid HTML
Google provides a "chart" for tables. I'm not going to do anything besides display the unified journal so there's not much to do here. I did verify that it can handle dates, floats, etc. natively. In order to display numbers (or anything else) in a specific way then you have to provide a `{v: _raw_value_, f: _formatted_string }` object.

### Hook Back Button

The complicated part about this is you have to keep track of the entire page as represented by a single state object. Some things won't be affected by the back button such as uploads.

### Separate JS Include

https://stackoverflow.com/questions/48843609

### Serving Assets

Images must be served out of Google Drive. I haven't figured out a way to serve directly through GAS.

https://stackoverflow.com/questions/11097350/how-to-display-a-google-drive-image-using-google-apps-scripts
