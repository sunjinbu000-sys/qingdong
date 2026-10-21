(function (root) {
  "use strict";
  const enc = {
      encode(value) {
        const encoded = encodeURIComponent(value);
        const bytes = [];
        for (let i = 0; i < encoded.length; i++) {
          if (encoded[i] === "%") {
            bytes.push(parseInt(encoded.slice(i + 1, i + 3), 16));
            i += 2;
          } else bytes.push(encoded.charCodeAt(i));
        }
        return new Uint8Array(bytes);
      },
    },
    xml = (x) =>
      String(x ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&apos;",
          })[c],
      ),
    crc = (b) => {
      let c = 0xffffffff;
      for (const x of b) {
        c ^= x;
        for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
      return (c ^ 0xffffffff) >>> 0;
    },
    join = (bs) => {
      const all = new Uint8Array(bs.reduce((n, b) => n + b.length, 0));
      let n = 0;
      for (const b of bs) {
        all.set(b, n);
        n += b.length;
      }
      return all;
    };
  function zip(files) {
    let offset = 0;
    const chunks = [],
      central = [];
    for (const [name, text] of Object.entries(files)) {
      const n = enc.encode(name),
        b = enc.encode(text),
        h = new Uint8Array(30 + n.length),
        v = new DataView(h.buffer),
        sum = crc(b);
      v.setUint32(0, 0x04034b50, true);
      v.setUint16(4, 20, true);
      v.setUint16(6, 0x800, true);
      v.setUint16(12, 0x21, true);
      v.setUint32(14, sum, true);
      v.setUint32(18, b.length, true);
      v.setUint32(22, b.length, true);
      v.setUint16(26, n.length, true);
      h.set(n, 30);
      chunks.push(h, b);
      const c = new Uint8Array(46 + n.length),
        cv = new DataView(c.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x800, true);
      cv.setUint16(14, 0x21, true);
      cv.setUint32(16, sum, true);
      cv.setUint32(20, b.length, true);
      cv.setUint32(24, b.length, true);
      cv.setUint16(28, n.length, true);
      cv.setUint32(42, offset, true);
      c.set(n, 46);
      central.push(c);
      offset += h.length + b.length;
    }
    const cd = join(central),
      end = new Uint8Array(22),
      ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, central.length, true);
    ev.setUint16(10, central.length, true);
    ev.setUint32(12, cd.length, true);
    ev.setUint32(16, offset, true);
    return join([...chunks, cd, end]);
  }
  function workbook(rows) {
    const col = (i) => {
      let s = "";
      for (i++; i; i = Math.floor((i - 1) / 26))
        s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
      return s;
    };
    const sheet =
      '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
      rows
        .map(
          (r, i) =>
            '<row r="' +
            (i + 1) +
            '">' +
            r
              .map(
                (x, j) =>
                  '<c r="' +
                  col(j) +
                  (i + 1) +
                  '" t="inlineStr"><is><t xml:space="preserve">' +
                  xml(x) +
                  "</t></is></c>",
              )
              .join("") +
            "</row>",
        )
        .join("") +
      "</sheetData></worksheet>";
    return zip({
      "[Content_Types].xml":
        '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
      "_rels/.rels":
        '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      "xl/workbook.xml":
        '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="AI调用日志" sheetId="1" r:id="rId1"/></sheets></workbook>',
      "xl/_rels/workbook.xml.rels":
        '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      "xl/worksheets/sheet1.xml": sheet,
    });
  }
  if (typeof module !== "undefined") module.exports = { workbook };
  else root.ExcelExport = { workbook };
})(typeof window !== "undefined" ? window : globalThis);
