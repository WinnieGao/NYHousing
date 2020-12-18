let height = 400;
let width = 1000;
let margin = ({top: 0, right: 40, bottom: 34, left: 40});

// Data structure describing type of displayed data
let AptType = {
    studio: "STUDIO",
    b1: "1-BR",
    b2: "2-BR",
    b3: "3-BR"
};

// Data structure describing legend fields value
let Legend = {
    studio: "Studio",
    b1: "1-Bedroom",
    b2: "2-Bedroom",
    b3: "3-Bedroom"
};

let chartState = {};

chartState.apt_type = AptType.studio;
chartState.legend = Legend.studio;


// Colors used for circles depending on continent
let colors = d3.scaleOrdinal()
    .domain(["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"])
    .range(['#D81B60','#1976D2','#388E3C','#FBC02D','#E64A19']);

d3.select("#BronxColor").style("color", colors("Bronx"));
d3.select("#BrooklynColor").style("color", colors("Brooklyn"));
d3.select("#ManhattanColor").style("color", colors("Manhattan"));
d3.select("#QueensColor").style("color", colors("Queens"));
d3.select("#StatenIslandColor").style("color", colors("Staten Island"));

let svg = d3.select("#svganchor")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

let xScale = d3.scaleLinear()
    .range([margin.left, width - margin.right]);

svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (height - margin.bottom) + ")");

// Create line that connects circle and X axis
let xLine = svg.append("line")
    .attr("stroke", "rgb(96,125,139)")
    .attr("stroke-dasharray", "1,2");

// Create tooltip div and make it invisible
let tooltip = d3.select("#svganchor").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Load and process data
d3.csv("https://raw.githubusercontent.com/WinnieGao/NYHousing/main/small_df.csv").then(function (data) {

    let dataSet = data;

    // Set chart domain max value to the highest total value in data set
    xScale.domain(d3.extent(data, function (d) {
        return +d.MedianActualRent;
    }));

    filter();

    // Listen to click on "total" and "per capita" buttons and trigger redraw when they are clicked
    d3.selectAll(".apt-type").on("click", function() {
        let thisClicked = this.value;
        chartState.apt_type = thisClicked;
        if (thisClicked === AptType.studio) {
            chartState.legend = Legend.studio;
        }
        if (thisClicked === AptType.b1) {
            chartState.legend = Legend.b1;
        }
        if (thisClicked === AptType.b2) {
            chartState.legend = Legend.b2;
        }
        if (thisClicked === AptType.b3) {
            chartState.legend = Legend.b3;
        }
        filter();
    });

    // Trigger filter function whenever checkbox is ticked/unticked
    d3.selectAll("input").on("change", filter);

    function redraw() {
        // Fixed Linear Scale
        xScale = d3.scaleLinear().range([ margin.left, width - margin.right ])

        xScale.domain(d3.extent(dataSet, function(d) {
            // return +d[chartState.measure];
            return +d["MedianActualRent"];
        }));

        let xAxis;
        // Set X axis based on new scale. If chart is set to "per capita" use numbers with one decimal point
        // if (chartState.measure === Count.perCap) {
        //     xAxis = d3.axisBottom(xScale)
        //         .ticks(10, ".1f")
        //         .tickSizeOuter(0);
        // }
        // else {
        //     xAxis = d3.axisBottom(xScale)
        //         .ticks(10, ".1s")
        //         .tickSizeOuter(0);
        // }

        xAxis = d3.axisBottom(xScale)
            .ticks(10, ".1f")
            .tickSizeOuter(0);

        d3.transition(svg).select(".x.axis")
            .transition()
            .duration(1000)
            .call(xAxis);

        // Create simulation with specified dataset
        let simulation = d3.forceSimulation(dataSet)
            // Apply positioning force to push nodes towards desired position along X axis
            .force("x", d3.forceX(function(d) {
                // Mapping of values from total/perCapita column of dataset to range of SVG chart (<margin.left, margin.right>)
                // return xScale(+d[chartState.measure]);  // This is the desired position
                return xScale(+d["MedianActualRent"]);
            }).strength(2))  // Increase velocity
            .force("y", d3.forceY((height / 2) - margin.bottom / 2))  // // Apply positioning force to push nodes towards center along Y axis
            .force("collide", d3.forceCollide(9)) // Apply collision force with radius of 9 - keeps nodes centers 9 pixels apart
            .stop();  // Stop simulation from starting automatically

        // Manually run simulation
        for (let i = 0; i < dataSet.length; ++i) {
            simulation.tick(1);
        }

        // Create country circles
        let dataCircles = svg.selectAll(".units")
            .data(dataSet, function(d) { return d.Borough });

        dataCircles.exit()
            .transition()
            .duration(1000)
            .attr("cx", 0)
            .attr("cy", (height / 2) - margin.bottom / 2)
            .remove();

        dataCircles.enter()
            .append("circle")
            .attr("class", "units")
            .attr("cx", 0)
            .attr("cy", (height / 2) - margin.bottom / 2)
            .attr("r", 6)
            .attr("fill", function(d){ return colors(d.Borough)})
            .merge(dataCircles)
            .transition()
            .duration(2000)
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });

        // Show tooltip when hovering over circle (data for respective country)
        d3.selectAll(".units").on("mousemove", function(d) {
            tooltip.html(`<strong>${chartState.legend}</strong><br>
                          Area: <strong>${d.Borough}</strong><br>
                          Rent: <strong>$ ${d.MedianActualRent}</strong>`)
                .style('top', d3.event.pageY - 12 + 'px')
                .style('left', d3.event.pageX + 25 + 'px')
                .style("opacity", 0.9);

            xLine.attr("x1", d3.select(this).attr("cx"))
                .attr("y1", d3.select(this).attr("cy"))
                .attr("y2", (height - margin.bottom))
                .attr("x2",  d3.select(this).attr("cx"))
                .attr("opacity", 1);

        }).on("mouseout", function(_) {
            tooltip.style("opacity", 0);
            xLine.attr("opacity", 0);
        });

    }

    // Filter data based on which checkboxes are ticked
    function filter() {

        function getCheckedBoxes(checkboxName) {

            let checkboxes = d3.selectAll(checkboxName).nodes();
            let checkboxesChecked = [];
            for (let i = 0; i < checkboxes.length; i++) {
                if (checkboxes[i].checked) {
                    checkboxesChecked.push(checkboxes[i].defaultValue);
                }
            }
            return checkboxesChecked.length > 0 ? checkboxesChecked : null;
        }

        let checkedBoxes = getCheckedBoxes(".area");

        let newData = [];

        if (checkedBoxes == null) {
            dataSet = newData;
            redraw();
            return;
        }

        for (let i = 0; i < checkedBoxes.length; i++){
            let newArray = data.filter(function(d) {
                return d.Borough === checkedBoxes[i] && d.BedroomSize === chartState.apt_type;
            });
            Array.prototype.push.apply(newData, newArray);
        }

        dataSet = newData;
        redraw();
    }

}).catch(function (error) {
    if (error) throw error;
});
