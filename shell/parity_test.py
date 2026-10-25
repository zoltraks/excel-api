#!/usr/bin/env python3
# Full operation-parity matrix: identical request set on all four servers,
# normalized response diff. Ports via env CROSS_PORTS (name=port pairs).
import json, os, sys, urllib.error, urllib.request

PORTS = {}
for pair in os.environ.get("CROSS_PORTS","node=4801 java=4802 csharp=4803 rust=4804").split():
    n,_,p = pair.partition("="); PORTS[n]=int(p)
BASE="http://localhost:%d/api/v1"
CID=os.environ.get("CROSS_CLIENT_ID","test-client"); SEC=os.environ.get("CROSS_CLIENT_SECRET","test-secret")

def req(m,port,path,body=None,tok=None,ctype="application/json",raw=False):
    h={}
    if ctype: h["Content-Type"]=ctype
    if tok: h["Authorization"]=f"Bearer {tok}"
    data = body.encode() if isinstance(body,str) else (json.dumps(body).encode() if body is not None else None)
    r=urllib.request.Request(BASE%port+path,method=m,data=data,headers=h)
    try:
        with urllib.request.urlopen(r,timeout=15) as x:
            b=x.read()
            if raw: return x.status,b
            try: return x.status,json.loads(b)
            except Exception: return x.status,{"_empty":True}
    except urllib.error.HTTPError as e:
        b=e.read()
        try: return e.code,json.loads(b)
        except Exception: return e.code,{"_raw":b.decode("utf-8","replace")}

VOLATILE={"uptime","time","zone","hostname","pid","started","modified","size","locked_at","applied_at","request_id","duration_ms","implementation","version"}
def norm(x):
    if isinstance(x,dict): return {k:norm(v) for k,v in x.items() if k not in VOLATILE}
    if isinstance(x,list): return [norm(v) for v in x]
    if isinstance(x,float): return round(x,6)
    return x

names=sorted(PORTS); fails=[]
def tok(port):
    st,res=req("POST",port,"/auth/token",
               {"grant_type":"client_credentials","client_id":CID,"client_secret":SEC})
    return res.get("access_token")
T={n:tok(PORTS[n]) for n in names}

def do_all(label,method,path,auth=True,percell=False,**kw):
    vals={}
    for i,n in enumerate(names):
        kw2=dict(kw)
        if percell:
            import copy; b2=copy.deepcopy(kw2.get("body"))
            if b2 and "operations" in b2:
                for op in b2["operations"]:
                    if "ref" in op: op["ref"]=f"Z{40+i}"
            elif b2 and "value" in b2:
                kw2["body"]={"value":b2["value"],"_ref":f"Z{40+i}"}
        if auth: kw2["tok"]=T[n]
        st,res=req(method,PORTS[n],path,**kw2)
        vals[n]=(st,norm(res))
    b=names[0]
    for n in names[1:]:
        if vals[n]!=vals[b]:
            fails.append(f"{label}: {b}{vals[b][0]}={json.dumps(vals[b][1])[:130]} != {n}{vals[n][0]}={json.dumps(vals[n][1])[:130]}")

# ---------- read ops ----------
do_all("health","GET","/health",auth=False)
do_all("workbooks","GET","/workbooks")
do_all("workbook-simple","GET","/workbooks/simple")
do_all("sheet","GET","/workbooks/simple/sheets/Sheet1")
do_all("columns","GET","/workbooks/simple/sheets/Sheet1/columns")
do_all("records-p1","GET","/workbooks/simple/sheets/Sheet1/records?limit=3")
do_all("records-p2","GET","/workbooks/simple/sheets/Sheet1/records?offset=2&limit=2")
do_all("record4","GET","/workbooks/simple/sheets/Sheet1/records/4")
do_all("cell-A1-native","GET","/workbooks/simple/sheets/Sheet1/cells/A1?format=native")
do_all("cell-A1-display","GET","/workbooks/simple/sheets/Sheet1/cells/A1?format=display")
do_all("cell-A1-string","GET","/workbooks/simple/sheets/Sheet1/cells/A1?format=string")
do_all("cell-date","GET","/workbooks/styled/sheets/Sheet1/cells/C2?format=native")
do_all("range","GET","/workbooks/simple/sheets/Sheet1/ranges/A1:C3")
do_all("range-formulas","GET","/workbooks/formulas/sheets/Sheet1/ranges/A1:D3?format=native")
do_all("lockstatus","GET","/workbooks/simple/lock-status")
do_all("styled-sheet","GET","/workbooks/styled/sheets/Sheet1")
do_all("multi-header-sheet","GET","/workbooks/multi-header/sheets/data")

ovals={}
for n in names:
    st,b=req("GET",PORTS[n],"/openapi.yaml",tok=T[n],raw=True)
    ovals[n]=(st,b.decode("utf-8","replace") if st==200 else "")
b=names[0]
for n in names[1:]:
    if ovals[n]!=ovals[b]: fails.append(f"openapi-yaml: {b} len={len(ovals[b][1])} != {n} len={len(ovals[n][1])}")

# ---------- write ops ----------
do_all("write-cell","PUT","/workbooks/simple/sheets/Sheet1/cells/Z20",body={"value":"parity-1"})
do_all("read-written","GET","/workbooks/simple/sheets/Sheet1/cells/Z20")
do_all("write-num","PUT","/workbooks/simple/sheets/Sheet1/cells/Z21",body={"value":42.5})
do_all("read-num","GET","/workbooks/simple/sheets/Sheet1/cells/Z21?format=native")
do_all("write-bool","PUT","/workbooks/simple/sheets/Sheet1/cells/Z22",body={"value":True})
do_all("read-bool","GET","/workbooks/simple/sheets/Sheet1/cells/Z22?format=native")
do_all("update-rec","PUT","/workbooks/simple/sheets/Sheet1/records/9",body={"data":{"Name":"parity-rec"}})
do_all("read-rec","GET","/workbooks/simple/sheets/Sheet1/records/9")
# add/del mutate the shared file sequentially - compare status+shape, not indexes
avals={}
for n in names:
    st,res=req("POST",PORTS[n],"/workbooks/simple/sheets/Sheet1/records",body={"data":{"ID":999,"Name":"parity-new"}},tok=T[n])
    avals[n]=(st,sorted(res.keys()) if isinstance(res,dict) else res)
b=names[0]
for n in names[1:]:
    if avals[n]!=avals[b]: fails.append(f"add-rec: {b}{avals[b][0]} shape != {n}{avals[n][0]} shape")
# restore fixture per impl - delete touches shared state
import shutil,glob
dvals={}
for n in names:
    for f in glob.glob("excel-api-test/fixture/*.xlsx"):
        shutil.copy(f,"work/itest/fixture/")
    st,res=req("DELETE",PORTS[n],"/workbooks/simple/sheets/Sheet1/records/12",tok=T[n])
    dvals[n]=(st,sorted(res.keys()) if isinstance(res,dict) else res)
b=names[0]
for n in names[1:]:
    if dvals[n]!=dvals[b]: fails.append(f"del-rec: {b}{dvals[b][0]} shape != {n}{dvals[n][0]} shape")
do_all("batch-cells","POST","/workbooks/simple/sheets/Sheet1/cells/operations",
       body={"operations":[{"op":"update","ref":"Z30","value":"b1"},{"op":"update","ref":"Z31","value":"b2"}]})
do_all("batch-records","POST","/workbooks/simple/sheets/Sheet1/operations",
       body={"operations":[{"op":"update","row_index":4,"data":{"Name":"brec"}}]})

# ---------- metrics shape ----------
mvals={}
for n in names:
    st,b=req("GET",PORTS[n],"/metrics",tok=T[n],raw=True)
    fams=sorted(set(l.split(" ")[0].split("{")[0] for l in b.decode("utf-8","replace").splitlines() if l.startswith("excel_api_")))
    mvals[n]=(st,fams)
b=names[0]
for n in names[1:]:
    if mvals[n]!=mvals[b]: fails.append(f"metrics: {b}={mvals[b][1]} != {n}={mvals[n][1]}")

# ---------- error parity ----------
do_all("err-404-wb","GET","/workbooks/nonexistent")
do_all("err-404-sheet","GET","/workbooks/simple/sheets/NoSheet")
do_all("err-404-rec","GET","/workbooks/simple/sheets/Sheet1/records/9999")
do_all("err-badcell","GET","/workbooks/simple/sheets/Sheet1/cells/!bogus")
do_all("err-badrange","GET","/workbooks/simple/sheets/Sheet1/ranges/ZZ99:ZZ999")
do_all("err-readonly","PUT","/workbooks/readonly-test/sheets/Sheet1/cells/A1",body={"value":"x"})
do_all("err-noauth","GET","/workbooks",auth=False)
do_all("err-badtok","GET","/workbooks",auth=False,tok="x")
do_all("err-badmethod","DELETE","/workbooks/simple/sheets/Sheet1/cells/A1")
do_all("err-record-body","PUT","/workbooks/simple/sheets/Sheet1/records/4",body={"Name":"x"})
do_all("err-cell-body","PUT","/workbooks/simple/sheets/Sheet1/cells/Z9",body={"bad":1})
do_all("err-text-body","POST","/workbooks/simple/sheets/Sheet1/cells/operations",body="x",ctype="text/plain")

print(f"{len(fails)} parity divergences:")
for f in fails: print("  "+f)
sys.exit(1 if fails else 0)
