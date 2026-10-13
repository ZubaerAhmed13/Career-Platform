#!/usr/bin/env python3
"""Run on the owned scanner host: actual TLS, authentication, ClamAV signature test.

Sends no CV data or secrets to ChatGPT/GitHub. EICAR is a standard harmless
antivirus test string; not a computer virus.
"""
import io
import json
import zipfile
from pathlib import Path
import ssl
import sys
import urllib.error
import urllib.request

CONFIG=Path(__file__).with_name(".env")

def values():
    if not CONFIG.exists():
        raise RuntimeError("Scanner .env is missing. Run setup.sh on the server.")
    out={}
    for line in CONFIG.read_text().splitlines():
        name,sep,value=line.partition("=")
        if sep and not name.lstrip().startswith("#"):
            out[name.strip()]=value.strip()
    for name in ("MODEL_DOMAIN","CV_SCAN_BEARER_TOKEN"):
        if not out.get(name):raise RuntimeError("Missing local setting "+name)
    if len(out["CV_SCAN_BEARER_TOKEN"])<32:
        raise RuntimeError("Scanner credential must be random and strong.")
    return out

def probe(base,data=b"benign test content",token=None,path="/scan",format_name=None):
    headers={"Content-Type":"application/octet-stream"}
    if token is not None:headers["Authorization"]="Bearer "+token
    if format_name is not None:headers["X-CV-Format"]=format_name
    request=urllib.request.Request(
        base+path,data=data,headers=headers,method="POST")
    try:
        with urllib.request.urlopen(
            request,timeout=35,context=ssl.create_default_context()) as response:
            body=response.read(512)
            return response.status,json.loads(body)
    except urllib.error.HTTPError as error:
        status=error.code
        error.close()
        return status,{}


def sample_docx():
    """A harmless DOCX generated locally; never contains personal information."""
    output=io.BytesIO()
    with zipfile.ZipFile(output,"w",zipfile.ZIP_DEFLATED) as document:
        document.writestr("[Content_Types].xml",
          '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
          '<Default Extension="xml" ContentType="application/xml"/>'
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
          '</Types>')
        document.writestr("_rels/.rels",
          '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
          'Target="word/document.xml"/></Relationships>')
        document.writestr("word/document.xml",
          '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
          '<w:body><w:p><w:r><w:t>Work Experience I reviewed inventory stock levels at a warehouse.</w:t></w:r>'
          '</w:p></w:body></w:document>')
    return output.getvalue()

def main():
    cfg=values()
    base="https://"+cfg["MODEL_DOMAIN"]
    token=cfg["CV_SCAN_BEARER_TOKEN"]
    status,_=probe(base)
    if status!=403:raise RuntimeError("Unauthenticated scan was not rejected.")
    status,_=probe(base,token=token,path="/api/tags")
    if status!=403:raise RuntimeError("Unexpected administrative endpoint access.")
    status,body=probe(base,token=token)
    if status!=200 or body.get("clean") is not True:
        raise RuntimeError("Clean-content scan failed. Check live clamd and signatures.")
    eicar=(b"X5O!P%@AP[4\\PZX54(P^)7CC)7}"
           b"$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*")
    status,body=probe(base,data=eicar,token=token)
    if status!=422 or body.get("clean") is not False:
        raise RuntimeError("The harmless EICAR test signature was not rejected.")
    status,result=probe(base,data=sample_docx(),token=token,path="/extract",format_name="docx")
    if status!=200 or result.get("clean") is not True or result.get("format")!="docx" or \
       "inventory stock levels" not in result.get("text",""):
        raise RuntimeError("Full scan and isolated DOCX parsing failed.")
    print("PASS: Isolated DOCX parsing returned text only AFTER ClamAV cleared the file.")
    print("PASS: HTTPS authorized clean scan and ClamAV EICAR rejection.")
    print("PASS: Unauthorized scan and administrative routes blocked.")
    print("No user CV, credential or test payload was printed.")

if __name__=="__main__":
    try:main()
    except (RuntimeError,OSError,ValueError,json.JSONDecodeError) as error:
        print("FAIL: "+str(error),file=sys.stderr)
        sys.exit(1)
