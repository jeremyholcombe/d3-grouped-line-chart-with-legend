function log(text) {
  if (console && console.log) console.log(text);
  return text;
}

var t = d3.transition()
    .duration(200);

var svg = d3.select("svg"),
    margin = {top: 20, right: 20, bottom: 50, left: 50},
    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom;

// add scales
var x = d3.scaleLinear().rangeRound([0, width]),
    y = d3.scaleLinear().rangeRound([height, 0]),
    color = d3.scaleOrdinal(d3.schemeCategory20);

// add chart
var chart = svg.append("g")
    .attr("transform", "translate("+margin.left+","+margin.top+")");

// line generator
var line = d3.line()
    .x(function(d) { return x(d.time); })
    .y(function(d) { return y(d.num_vehicles_t); });

// DATA-DRIVEN CODE ------------------------
d3.csv("line2.csv", function(d) {
  d.num_vehicles_t = +d.num_vehicles_t; // coerce to number
  d.time = +d.time; // coerce to number
  return d;
}, function(error, data) {
  if (error) throw error;

  // nest arrays by each make/model so we can create separate series
  var nested = d3.nest()
    .key(function(d) { return d.make_model; })
    .entries(data);

  // set domains
  x.domain(d3.extent(data, function(d) { return d.time; }));
  y.domain(d3.extent(data, function(d) { return d.num_vehicles_t; }));

  // add line/label to mark date selected by user
  chart.append("line")
      .attr("class", "day-marker")
      .attr("x1", x(30))
      .attr("x2", x(30))
      .attr("y1", -20)
      .attr("y2", height);
  chart.append("rect")
      .attr("class", "marker-label")
      .attr("x", x(30)-27)
      .attr("y", -20)
      .attr("width", 54)
      .attr("height", 15)
      .attr("rx", 3)
      .attr("ry", 3);
  chart.append("text")
      .attr("class", "marker-text")
      .attr("x", x(30))
      .attr("y", -20)
      .attr("dy", 11.5)
      .attr("text-anchor", "middle")
      .text("30 Days");


  // x-axis
  chart.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));
  chart.append("text") // label
      .attr("class", "axis-label")
      .attr("x", width/2)
      .attr("y", height)
      .attr("dy", 30)
      .attr("text-anchor", "middle")
      .text("Days from Today");

  // y-axis
  chart.append("g")
      .attr("class", "y axis")
      .call(d3.axisLeft(y));
  chart.append("text") // label
      .attr("class", "axis-label")
      .attr("x", 0 - (height / 2))
      .attr("dy", -30)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .text("# of Vehicles");

  // create group to hold all lines
  var lineGroup = chart.append("g")
      .attr("id", "lineGroup");

  // create tooltip
  var tooltip = d3.tip()
      .attr("class", "d3-tip")
      .offset([-10, 0])
      .html(function(d) {
        return d.make_model + "<br>" +
        "<b>" + d.time + " Days</b> from today<br>" +
        "<b>" + d.num_vehicles_t + " vehicle(s)</b> in stock";
      });

  chart.call(tooltip);

  // LINES AND CIRCLES --------------------
  nested.forEach(function(d,i) {

    // group for all series
    var lines = lineGroup.append("g")
        .attr("class", function() {
          // set class to lower-case make/model w/ no whitespace
          return d.key.replace(/\s/g, '').toLowerCase();
        });

    // append lines for each make/model
    lines.append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", function() { return color(d.key); })
        .attr("stroke-width", "1px")
        .attr("d", line(d.values))
        .each(function(d) { this._current = d; });

    // add white circles to lines, inherit stroke
    lines.selectAll("circle")
        .data(d.values)
      .enter().append("circle")
        .attr("class", "circle")
        .attr("fill", "white")
        .attr("stroke", function() { return color(d.key); })
        .attr("cx", function(d) { return x(d.time); })
        .attr("cy", function(d) { return y(d.num_vehicles_t); })
        .attr("r", 5);

    // white rect background for data labels (see next code block)
    lines.selectAll("rect")
        .data(d.values)
      .enter().append("rect")
        .attr("width", 15)
        .attr("height", 10)
        .attr("x", function(d) { return x(d.time) - 7.5; })
        .attr("y", function(d) { return y(d.num_vehicles_t) - 18; })
        .attr("fill", "none");

    // data labels: hidden unless you hover over legend item
    lines.selectAll("text")
        .data(d.values)
      .enter().append("text")
        .attr("class", "text data-label")
        .attr("x", function(d) { return x(d.time); })
        .attr("y", function(d) { return y(d.num_vehicles_t); })
        .attr("dy", -10)
        .attr("text-anchor", "middle")
        .attr("fill", "none")
        .text(function(d) { return d.num_vehicles_t; });

  }); // END LINES AND CIRCLES

  // TOOLTIPS ----------------------
  d3.selectAll("circle")
    .on("mouseover", function(d) {
      // show tooltip
      tooltip.show(d);
      // set border of tooltip to line color
      var lineColor = d3.select(this).attr("stroke");
      tooltip.style("border-color", lineColor);
      // increase stroke width for circle
      d3.select(this).attr("stroke-width", "3px");
      // increase stroke width for line
      d3.select(this.parentNode.firstChild).attr("stroke-width", "3px");
      // purely so CSS triangle can inherit lineColor
      tooltip.style("border-top-color", lineColor);
    })
    .on("mouseout", function(d) {
      // hide tooltip
      tooltip.hide(d);
      // reset stroke width for circle
      d3.select(this).attr("stroke-width", "1px");
      // reset stroke width for line
      d3.select(this.parentNode.firstChild).attr("stroke-width", "1px");
    });

  // LEGEND W/ PAGING -----------------
  // solution adapted from: http://bl.ocks.org/pragyandas/6af4113bdb9127260ce1
  var labels = color.domain(), // refers to array of make/models
      legendCount = labels.length,
      legendWidth = 10,
      legendSpacing = 6,
      netLegendHeight = (legendWidth + legendSpacing) * legendCount,
      legendPerPage, totalPages, pageNo;

  // draw paging legend if it extends past half of chart
  if (netLegendHeight / height > 0.5) {
    legendPerPage = Math.floor((height / 2) / (legendWidth + legendSpacing));
    totalPages = Math.ceil(legendCount / legendPerPage);
    pageNo = 1;

    // declare local variables
    var startIndex = (pageNo - 1) * legendPerPage,
        endIndex = startIndex + legendPerPage,
        labelsSubset = [], colorSubset = [];

    // create subset arrays for visible portion of legend
    for (i = 0; i < labels.length; i++) {
      if (i >= startIndex && i < endIndex) {
        labelsSubset.push(labels[i]);
        colorSubset.push(color(labels[i]));
      }
    }
    subsetIndicator = true;
    // create legend with subset of labels
    drawLegendSubset(labelsSubset, colorSubset, legendPerPage, pageNo,
                    totalPages, labels, subsetIndicator);
  } else {
    labelsSubset = labels;
    subsetIndicator = false;
    // create legend with subset of labels
    drawLegendSubset(labelsSubset, colorSubset, legendPerPage, pageNo,
                    totalPages, labels, subsetIndicator);
  }

  function drawLegendSubset(labelsSubset, colorSubset, legendPerPage, pageNo,
                  totalPages, labels, subsetIndicator) {
    // Find the longest legend label in the dataset
    var labelLength = 0, maxLabel;
    for (i = 0; i < labels.length; i++) {
      if (labels[i].length > labelLength) {
        labelLength = labels[i].length;
        maxLabel = labels[i];
      }
    }
    // Append the longest label, compute its width, remove it
    svg.append("text").text(maxLabel)
      .each(function() { labelWidth = this.getBBox().width; })
      .remove();

    // add group to hold all legend items
    var legend = chart.append("g")
        .attr("id", "legend")
        .attr("transform", function() {
          return "translate(" + Math.min(width - labelWidth, width-100) + ",0)";
        });

    // FILTERS ------------------------------

    // filters go in defs element
    var defs = legend.append("defs");

    // create filter with id #drop-shadow
    // height=130% so that the shadow is not clipped
    var filter = defs.append("filter")
        .attr("id", "drop-shadow")
        .attr("height", "130%");

    // SourceAlpha refers to opacity of graphic that this filter will be applied to
    // convolve that with a Gaussian with standard deviation 3 and store result
    // in blur
    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 2)
        .attr("result", "blur");

    // translate output of Gaussian blur to the right and downwards with 2px
    // store result in offsetBlur
    filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 1)
        .attr("dy", 1)
        .attr("result", "offsetBlur");

    // overlay original SourceGraphic over translated blurred opacity by using
    // feMerge filter. Order of specifying inputs is important!
    var feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode")
        .attr("in", "offsetBlur")
    feMerge.append("feMergeNode")
        .attr("in", "SourceGraphic");

    // apply drop-shadow filter to legend
    legend.append("rect")
        .attr("width", labelWidth + (legendSpacing * 2) + 20)
        .attr("height", legendPerPage * (legendWidth + legendSpacing) + 30)
        .attr("x", -15)
        .attr("y", -15)
        .attr("fill", "white")
        .style("filter", "url(#drop-shadow)");

    // add labels for legend items
    var legendItem = legend.selectAll(".legend-item")
        .data(labelsSubset)
      .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", function(d, i) {
          var height = legendWidth + legendSpacing;
          return "translate(0," + (i * height) + ")";
        })
        .on("mouseover", function(label) {
          // reduce opacity for all lines
          d3.selectAll(".legend-item")
              .attr("stroke-opacity", 0.4)
              .attr("fill-opacity", 0.4);
          // except the line being hovered over
          d3.select(this)
              .attr("stroke-opacity", null)
              .attr("fill-opacity", null);
          // hide all lines
          d3.selectAll("#lineGroup g").attr("stroke-opacity", 0);
          // make all circles transparent
          d3.selectAll("#lineGroup g circle").attr("fill", "transparent");
          // except the line/circles being hovered over
          d3.select("." + label.replace(/\s/g, '').toLowerCase())
              .attr("stroke-opacity", null);
          d3.selectAll("." + label.replace(/\s/g, '').toLowerCase() + " circle")
              .attr("fill", "white");
          // enable data labels on line hovered over
          d3.selectAll("." + label.replace(/\s/g, '').toLowerCase() + " rect")
              .attr("fill", "white");
          // enable data labels on line hovered over
          d3.selectAll("." + label.replace(/\s/g, '').toLowerCase() + " text")
              .attr("fill", "gray");
        })
        .on("mouseout", function(label) {
          d3.selectAll(".legend-item")
              .attr("stroke-opacity", null)
              .attr("fill-opacity", null);
          d3.selectAll("#lineGroup g").attr("stroke-opacity", null);
          d3.selectAll("#lineGroup g circle").attr("fill", "white");
          d3.selectAll("#lineGroup g text").attr("fill", "none");
          d3.selectAll("#lineGroup g rect").attr("fill", "none");
        });

    // add circle symbol for legend items
    legendItem.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 5)
        .style("fill", "white")
        .style("stroke", color)
        .style("stroke-width", "2px");
    // add legend item labels
    legendItem.append("text")
        .attr("x", legendWidth + legendSpacing)
        .attr("y", legendWidth - legendSpacing)
        .text(function(d) { return d; });
    // add transparent rect to allow smoother scrolling thru legend items,
    // otherwise there is flickering
    legendItem.append("rect")
        .attr("width", labelWidth + (legendSpacing * 2))
        .attr("height", legendWidth + legendSpacing)
        .attr("x", -legendSpacing)
        .attr("y", -(legendWidth + legendSpacing) / 2)
        .attr("fill", "transparent");

    if (subsetIndicator) {
      var pageGroup = chart.append("g")
          .attr("class", "page-number")
          .attr("transform", "translate(" + (width - labelWidth - 5) + "," +
                (5 + legendPerPage * (legendWidth + legendSpacing)) + ")");

      pageGroup.append("text")
          .text(pageNo + "/" + totalPages)
          .attr("dx", 12);

      var prevTriangle = pageGroup.append("g")
          .attr("transform", "translate(0, -6)")
          .attr("class", "prev")
          .on("click", prevLegend)
          .style("cursor", "pointer");

      var nextTriangle = pageGroup.append("g")
          .attr("class", "next")
          .attr("transform", "translate(30, -6)")
          .on("click", nextLegend)
          .style("cursor", "pointer");

      nextTriangle.append("polygon")
          .style("stroke", "steelblue")
          .style("fill", "steelblue")
          .attr("points", "0,0, 10,0, 5,5");

      prevTriangle.append("polygon")
          .style("stroke", "steelblue")
          .style("fill", "steelblue")
          .attr("points", "0,5, 10,5, 5,0");

      if (pageNo == totalPages) {
        nextTriangle.style("opacity", "0.5")
        nextTriangle.on("click", null)
        .style("cursor", null);
      } else if (pageNo == 1) {
        prevTriangle.style("opacity", "0.5")
        prevTriangle.on("click", null)
        .style("cursor", null);
      }
    } // END IF SUBSET

  } // END DRAW LEGEND SUBSET

  function prevLegend() {
    pageNo--;

    chart.selectAll("#legend").remove();
    chart.select(".page-number").remove();
    chart.select(".prev").remove();
    chart.select(".next").remove();

    // declare local variables
    var startIndex = (pageNo - 1) * legendPerPage,
        endIndex = startIndex + legendPerPage,
        labelsSubset = [], colorSubset = [];

    // create subset arrays for visible portion of legend
    for (i = 0; i < labels.length; i++) {
      if (i >= startIndex && i < endIndex) {
        labelsSubset.push(labels[i]);
        colorSubset.push(color(labels[i]));
      }
    }
    // create legend with subset of labels
    drawLegendSubset(labelsSubset, colorSubset, legendPerPage, pageNo,
                    totalPages, labels, subsetIndicator);
  } // END PREV LEGEND

  function nextLegend() {
    pageNo++;

    chart.selectAll("#legend").remove();
    chart.select(".page-number").remove();
    chart.select(".prev").remove();
    chart.select(".next").remove();

    // declare local variables
    var startIndex = (pageNo - 1) * legendPerPage,
        endIndex = startIndex + legendPerPage,
        labelsSubset = [], colorSubset = [];

    // create subset arrays for visible portion of legend
    for (i = 0; i < labels.length; i++) {
      if (i >= startIndex && i < endIndex) {
        labelsSubset.push(labels[i]);
        colorSubset.push(color(labels[i]));
      }
    }
    // create legend with subset of labels
    drawLegendSubset(labelsSubset, colorSubset, legendPerPage, pageNo,
                    totalPages, labels, subsetIndicator);
  } // END NEXT LEGEND

}); // END DATA-DRIVEN CODE
