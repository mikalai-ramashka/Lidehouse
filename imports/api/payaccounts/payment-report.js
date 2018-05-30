import { _ } from 'meteor/underscore';
import { numeral } from 'meteor/numeral:numeral';
import { Payments } from '/imports/api/payments/payments.js';

export class PaymentReport {
  constructor() {
    this.filters = {};
    this.rows = [];
    this.cols = [];
  }

  headerLinesCount(dim) {
    const otherDim = (dim === 'rows') ? 'cols' : 'rows';
    let max = 0;
    this[otherDim].forEach(line => max = Math.max(max, line.length));
    return max;
  }

  addFilter(filter) {
    _.extend(this.filters, filter);
  }

  // A lineDef is an array of filters. Each elem in the array is a filter that will show its *value* on the title bar
  addLine(dim, lineDef, asFirst = false) {
    if (asFirst) {
      this[dim].unshift(lineDef);
    } else {
      this[dim].push(lineDef);
    }
  }

  // Adding a whole tree of lines, separately or descarting the current set of lines
  addTree(dim, treeDef, descartes = true, sumFirst = true, asFirst = false) {
    let nodes = treeDef.values.nodes();
    if (!sumFirst) nodes = nodes.reverse();
    const newLineDefs = nodes.map(node => PaymentReport.nodeToLineDef(treeDef.field, node));
    if (descartes) {
      this.addDescartesProductLines(dim, newLineDefs);
    } else {
      newLineDefs.forEach(lineDef => this.addLine(dim, [lineDef], asFirst));
    }
  }

  static nodeToLineDef(field, node) {
    return {
      field,
      value: node.label || node.name,
      values: { $in: _.pluck(node.leafs(), 'name') },
      class: 'header-level' + node.level,
      filter() {
        const obj = {};
        obj[this.field] = this.values;
        return obj;
      },
    };
  }

  createTableHeader() {
    const headerRows = [];
    for (let y = 0; y < this.headerLinesCount('rows'); y++) {
      const headerRow = [];
      for (let x = 0; x < this.headerLinesCount('cols'); x++) {
        const emptyCell = { class: '', value: ' ' };
        headerRow.push(emptyCell);
      }
      for (let x = 0; x < this.cols.length; x++) {
        const col = this.cols[x];
        headerRow.push(col[y]);
      }
      headerRows.push(headerRow);
    }
    return headerRows;
  }

  createTableBody() {
    const bodyRows = [];
    for (let y = 0; y < this.rows.length; y++) {
      const bodyRow = [];
      const row = this.rows[y];
      for (let x = 0; x < this.headerLinesCount('cols'); x++) {
        bodyRow.push(row[x]);
      }
      for (let x = 0; x < this.cols.length; x++) {
        const col = this.cols[x];
        bodyRow.push(this.cell(x, y));
      }
      bodyRows.push(bodyRow);
    }
    return bodyRows;
  }

  cell(x, y) {
    const col = this.cols[x];
    const row = this.rows[y];
    const filter = _.extend({}, this.filters);

    let classes = 'cell';
    function addFilter(f) {
      _.extend(filter, f.filter());
      classes += ' ' + f.class;
    }
    col.forEach(addFilter);
    row.forEach(addFilter);

    let amount = 0;
    const payments = Payments.find(filter);
    payments.forEach(pay => amount += pay.amount);

    if (amount < -0.001) classes += ' negative';
//    console.log(`${x}, ${y}: filter:`); console.log(filter);
    return { class: classes, value: numeral(amount).format() };
  }

  addDescartesProductLines(dim, newLineDefs) {
    const result = [];
    const currentLines = this[dim];
    currentLines.forEach(line =>
      newLineDefs.forEach(newLineDef =>
        result.push(line.concat([newLineDef]))
      )
    );
    this[dim] = result;
  }
}
