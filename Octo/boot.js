var fw_progress = 0;
var last_fw_progress = 0;
var fw_counter = 0;
var verify_fw_progress = 0;
var verify_last_fw_progress = 0;
var verify_fw_counter = 0;
var timer;
var verfiy_timer;
var fileData;
var EncodedString = "";

const ConfigData = {};
let file_data;

function fetchFile(fileUrl) {
    return fetch(fileUrl)
      .then(response => response.text())
      .then(data => {
        const lines = data.split(/\r?\n/);

        const linesObj = lines.reduce((acc, line) => {
          if (line.indexOf('=') === -1) return acc;

          const l = line.split('=');
          acc[l[0]] = l[1];
          return acc;
        }, {});
        return linesObj;
      })
      .catch(errorMsg => {
        showMessage(errorMsg, 'error');
      });
  }


function getStatusData() {
    fetchFile('index.html?config=1').then(obj => {
        Object.keys(obj).forEach(key => {
        switch (key) {
            case 'dhcp_enable':
            ConfigData[key] = obj[key] == 0 ? "<font color='red'> <b> Disabled </b> </font>" : "<font color='green'> <b> Enabled </b> </font>";
            break;
            case 'link_speed':
            ConfigData[key] = obj[key] + ' Mbps';
            break;
            default:
            ConfigData[key] = obj[key];
            break;
        }
        });

        document.getElementById("boot_version").innerHTML = ConfigData['boot_version'];
        document.getElementById("firmware_version").innerHTML = "<font color='blue'>"+ConfigData['firmware_version']+"</font>";
        document.getElementById("mac_address").innerHTML = ConfigData['mac_address'];
        document.getElementById("link_speed").innerHTML = ConfigData['link_speed'];
        document.getElementById("dhcp").innerHTML = ConfigData['dhcp_enable'];
        document.getElementById("ipadd").innerHTML = ConfigData['actual_ip'];
        document.getElementById("gwipadd").innerHTML = ConfigData['actual_gw_ip'];
    });
}


function redirect(timeout)
{
    setTimeout(function () {
           window.location.href = "index.html";
        }, timeout);
}

function fnetXMLHttpRequest(){
    var xmlHTTP = false;
   // if (window.ActiveXObject)
   //     xmlHTTP = new ActiveXObject("Microsoft.XMLHTTP");
    if (window.XMLHttpRequest)
        xmlHTTP = new XMLHttpRequest();
    if (!xmlHTTP)
        alert("Unable to Forward Request - Please use a modern browser!");
    return xmlHTTP;
}

/**
 * Emulate FormData for some browsers
 * MIT License
 * (c) 2010 François de Metz
 */
(function(w) {
    if (w.FormData)
        return;
    function FormData() {
        this.fake = true;
        this.boundary = "--------FormData" + Math.random();
        this._fields = [];
    }
    FormData.prototype.append = function(key, value) {
        this._fields.push([key, value]);
    }
    FormData.prototype.toString = function() {
        var boundary = this.boundary;
        var body = "";
        this._fields.forEach(function(field) {
            body += "--" + boundary + "\r\n";
            // file upload
            if (field[1].name) {
                var file = field[1];
                body += "Content-Disposition: form-data; name=\""+ field[0] +"\"; filename=\""+ file.name +"\"\r\n";
                body += "Content-Type: "+ file.type +"\r\n\r\n";
                body += file.getAsBinary() + "\r\n";
            } else {
                body += "Content-Disposition: form-data; name=\""+ field[0] +"\";\r\n\r\n";
                body += field[1] + "\r\n";
            }
        });
        body += "--" + boundary +"--";
        return body;
    }
    w.FormData = FormData;
})(window);

/* Function that checks the vaildity of IP address */
function valid_ip(field) {
    ipaddr = field;
   var re = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
   if (re.test(ipaddr)) {
      var parts = ipaddr.split(".");
      if (parseInt(parseFloat(parts[0])) == 0) { return false; }
      if (parseInt(parseFloat(parts[3])) == 0) { return false; }
      for (var i=0; i<parts.length; i++) {
         if (parseInt(parseFloat(parts[i])) > 255) { return false; }
      }
      return true;
   } else {
      return false;
   }
}

function valid_mask(field)
{
    //m[0] can be 128, 192, 224, 240, 248, 252, 254, 255
    //m[1] can be 128, 192, 224, 240, 248, 252, 254, 255 if m[0] is 255, else m[1] must be 0
    //m[2] can be 128, 192, 224, 240, 248, 252, 254, 255 if m[1] is 255, else m[2] must be 0
    //m[3] can be 128, 192, 224, 240, 248, 252, 254, 255 if m[2] is 255, else m[3] must be 0
    var return_val = true;
    var correct_range = {128:1,192:1,224:1,240:1,248:1,252:1,254:1,255:1,0:1};
    var m = field.split('.');

    for (var i = 0; i <= 3; i ++) {
        if (!(m[i] in correct_range)) {
            return_val = false;
            break;
        }
    }

    if ((m[0] == 0) || (m[0] != 255 && m[1] != 0) || (m[1] != 255 && m[2] != 0) || (m[2] != 255 && m[3] != 0)) {
        return_val = false;
    }

   return  return_val;
}


function validate_status(myForm)
{
    one = new Array ();
    nmask = new Array ();
    for (var i =0; i< myForm.elements.length ; i++)
    {
       if (myForm.elements[i].id=='ip[]')
            one[one.length] = myForm.elements[i].value;
    }
    ip1 = one.join(".");
    if (!valid_ip(ip1))
    {
        alert(" ERROR !! \n IP Adress Invalid ! Please correct & submit ");
        return false;
    }

    for (var i =0; i< myForm.elements.length ; i++)
    {
       if (myForm.elements[i].id=='nm[]')
            nmask[nmask.length] = myForm.elements[i].value;

    }
    nm = nmask.join(".");
    if (!valid_mask(nm))
    {
        alert(" ERROR !! \n Net Mask is Invalid ! Please correct & submit ");
        return false;
    }
    return true;
}

function RefreshPage(){
   window.location.reload(true);
}

function ProcessFile(readFile)
{
    var reader = new FileReader();
    reader.readAsDataURL(readFile);
    reader.onload = PostFirmware;
    reader.onerror = fileErrorHandler;
}

function fileErrorHandler(evt) {
  if(evt.target.error.name == "NotReadableError") {
    ;
    //console.log("The file could not be read.");
  }
}

function CheckFirmware()
{
    var files = document.getElementById("firmware_id").files;
    var upload_status = document.getElementById("upload_status");
    var upload_text = document.getElementById("upload_text");
    var unsupported = false;
    file_data = files[0];

    verify_fw_progress = 0;
    verify_last_fw_progress = 0;
    verify_fw_counter = 0;
    upload_text.innerHTML = "<b> Update progress: </b>";

    if (file_data.size > ConfigData['max_fw_length']) {
      alert('Maximum Firmware file size exceeded');
      return false;
    }

    if(window.FormData === undefined) {
      alert("error: Your Browser does not support Firmware Upload method! \nPlease upgrade your browser or use IE10+, Chrome or Firefox");
      return false;
    }

    if (!file_data) {
      alert("error: No File selected!");
      return false;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const nameString = event.target.result.slice(-32);
      const name = nameString.split('\u0000')[0];

      if (name !== ConfigData['product_name']) {
        alert("Incorrect Firmware file");
        return false;
      }

      document.getElementById("fw_update").disabled = true;
      document.getElementById("open_firmware").disabled = true;
      document.getElementById("file_name").disabled = true;
      upload_status.innerHTML = " ";

      console.log('ProcessFile');
      ProcessFile(file_data);
    }
    reader.onerror = error => reject(error);
    reader.readAsBinaryString(file_data);
}

function PostFirmware(e)
{
    var fw_response = 0;
    fw_counter = 0;
    // show loading bar:
    document.getElementById("fw_loader").style.display = 'block';
    clearInterval(timer);

    var is_loading = "<font color='orange' size=4> <b> Firmware uploading .... </b> </font> <br/>  <span class='hint'> Please do not interrupt. <br/> Page will refresh, once firmware update is complete </span>";
    var upload_status = document.getElementById("upload_status");
    var upload_text = document.getElementById("upload_text");
    if (e.target && e.target.result)
        var encoded =  e.target.result;
    var boundary = "firmware-e3";
    EncodedString = "--" + boundary + "--\r\n";
    EncodedString += 'content-disposition: form-data; '
         + 'name="'         + file_data.name + '"; '
         + 'filename="'     + file_data.name + '"\r\n';
    EncodedString += 'Content-Type: application/octet-stream\r\n';
    EncodedString += '\r\n';
    EncodedString += encoded + '\r\n';
    EncodedString += "--" + boundary + "--\r\n";


    upload_status.innerHTML = is_loading;

    var xmlHTTP = fnetXMLHttpRequest();
    xmlHTTP.open("POST", "index.html"+'?'+"firmware.cgi", true);
    xmlHTTP.setRequestHeader("Content-type","application/octet-stream");
    xmlHTTP.send(EncodedString);
    setTimeout(CheckProgress,999);
    // timer = setInterval(CheckProgress,999);
}

function CheckProgress()
{
   var percent = 0;
   var movement = 0;
   var myprogress = " ";
   var fw_progress = "";
   var fw_error_msg = " reason: Unable to verify firmware ! ";
   var upload_status = document.getElementById("upload_status");
   var xmlHTTP = fnetXMLHttpRequest();
   if (xmlHTTP != null)
   {
        xmlHTTP.onreadystatechange = function()
        {
            if ((xmlHTTP.readyState == 4) && (xmlHTTP.status == 200))
            {
                fw_progress =  xmlHTTP.responseText;
                if (fw_progress == "PASS")
                {
                    upload_status.innerHTML = "<font color='green' size=3> <b> &#10004; Firmware updated successfully ... Refreshing page now ... </b> </font>";
                    document.getElementById("fw_loader").style.display = 'none';
                    // clearInterval(timer);
                    console.log("Should reset");
                    setTimeout(HandleReboot,500);
                    // redirect(3500);
                }
                else if (fw_progress == "FAIL" || fw_progress == "BAD_CRC" || fw_progress == "BAD_AUTH")
                {
                    clearInterval(timer);
                    if (fw_progress == "FAIL")
                        fw_error_msg = " reason: Unable to upload firmware ! ";
                    if (fw_progress == "BAD_CRC")
                        fw_error_msg = " reason: Bad firmware file used ! ";
                    if (fw_progress == "BAD_AUTH")
                        fw_error_msg = " reason: Authentication check failed ! ";
                    upload_status.innerHTML = "<font color='red' size=3> &#x2718; <b> error: Firmware update FAILED <br/> "+fw_error_msg+" </b> </font> <br/> Please <a href='index.html'> click here to reload the page </a>, and try again";
                    document.getElementById("fw_loader").style.display = 'none';
                }
                else if (fw_counter == 200)
                {
                    // clearInterval(timer);
                    fw_error_msg = "reason: no response from the unit  (timeout) !";
                    upload_status.innerHTML = "<font color='red' size=3> &#x2718; <b> error: Firmware update FAILED <br/> "+fw_error_msg+" </b> </font> <br/> Please <a href='index.html'> click here to reload the page </a>, and try again";
                    document.getElementById("fw_loader").style.display = 'none';
                }
                else if (fw_progress < 100)
                {
                    percent =  Math.round(fw_progress);
                    if (percent < 10)
                        percent = 10;
                    movement = fw_counter + 5;
                    myprogress =   "<div id='progressbar'> <div style='width:"+percent+"%; margin-left:"+movement+";'>";
                    myprogress += " <span style='float: right; margin-right: 10px;'> <font color='white' size=3> <b> "+Math.round(fw_progress)+"%</b> </font> </span>  </div> </div>";
                    upload_status.innerHTML = myprogress;
                    setTimeout(CheckProgress, 999);
                }
                else if (fw_counter > 0)
                {
                    movement = fw_counter + 5;
                    myprogress =   "<div id='progressbar'> <div style='width:"+percent+"%; margin-left:"+movement+";'>";
                    myprogress += " <span style='float: right; margin-right: 10px;'> <font color='white' size=3> <b> "+percent+"%</b> </font> </span>  </div> </div>";
                    upload_status.innerHTML = myprogress;
                    setTimeout(CheckProgress, 999);
                }
                //console.log("Firmware Response: "+fw_progress+" JS Check Counter: "+fw_counter);
            }
        };
        xmlHTTP.open("GET","index.html?"+"progress=1", true);
        xmlHTTP.send(null);
   }
   if (last_fw_progress == fw_progress)
     fw_counter ++;
   else
     fw_counter = 0;

   last_fw_progress =  fw_progress;

}

function HandleReboot()
{
   document.getElementById('content').innerHTML= "<div align='center'> <span id='preload'>  <br/> <br/> <br/> <br/> <br/> <br/> </span>  <div id='warning'>  System is rebooting... please wait ...</div>   </div>  <div class='loader'> &nbsp; </div>";

    var xmlHTTP = fnetXMLHttpRequest();
    xmlHTTP.onreadystatechange = function()
    {
        if ((xmlHTTP.readyState == 4) && (xmlHTTP.status == 200))
            redirect(7500);
        else
            redirect(7500);
    }
    xmlHTTP.open("GET", "index.html?"+"reboot=1", true);
    xmlHTTP.send(null);
}

function ErrorHandler(event){
   var upload_status = document.getElementById("upload_status");
     upload_status.innerHTML="<font color='red'> <b> Firmware Upload Failed </b> </font>";
}
function AbortHandler(event){
   var upload_status = document.getElementById("upload_status");
     upload_status.innerHTML="<font color='red'> <b> Firmware Upload Cancelled </b> </font>";
}

function ConfirmReset()
{
    if(confirm('Reset the settings to Factory Defaults? \nPlease Confirm...'))
        return true;
    else
        return false;
}

function ShowFilename(obj) {
    var file = obj.value;
    var fileName = file.split("\\");
    document.getElementById("file_name").value = fileName[fileName.length - 1];
}

function OpenFirmwareFile() {
    document.getElementById("firmware_id").click();
}
