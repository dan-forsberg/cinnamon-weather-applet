const Applet = imports.ui.applet;
const Soup = imports.gi.Soup;

const _session = new Soup.SessionSync();

function main(metadata, orientation, panel_height, instance_id) {
    return new Weather(orientation, panel_height, instance_id);
}

function Weather(orientation, panel_height, instance_id) {
    this._init(orientation, panel_height, instance_id);
}

Weather.prototype = {
    /* due to lack of sprintf, this will do for simplicity
     * full URL is constructed in #_getData() and #updateData() */
    _baseURL: "https://opendata-download-metfcst.smhi.se/api/category/pmp3g/" +
        "version/2/geotype/point/lon/",
    _lon: 20.307247,
    _lat: 63.838241,
    /* Default coordinates point to Umeå */
    
    _data: null,

    __proto__: Applet.TextIconApplet.prototype,

    _init: function(orientation, panel_height, instance_id) {
        Applet.TextIconApplet.prototype._init.call(this, orientation,
            panel_height, instance_id);
        //this.set_applet_icon_symbolic_name("weather-sun");
        this.set_applet_tooltip(_("Weather"));
        this.set_applet_label(_("Loading..."));
        this._getData();

    },

    /**
     * Set the latitute and longitude to another loc than hard-coded defaults
     */
    setLoc: function(lat, lon) {
        this.lat = lat;
        this.lon = lon;
    },

    /**
     * Synchronously gets data from the SMHI-server -- only really meant to be
     * used when starting.
     *
     * In case of an error or unexpected result, an Error is thrown but
     * not handled.
     */
    _getData: function() {
        let url = this._baseURL + this._lon + "/lat/" + this._lat + "/data.json";
        let msg = Soup.Message.new('GET', url);

        if (!msg)
            new Error("msg null in _getData");

        let resp = _session.send_message(msg);
        if (resp != 200)
            new Error("Response is " + resp + " expected 200.");
        if (!msg.response_body || !msg.response_body.data)
            new Error("Response or data is null.");

        global.log(url);

    },

    /**
     * Asynchronously update the data -- should be called every now and then
     * (at least hourly).
     *
     * In case of an error or unexpected result, an Error is thrown but 
     * not handled.
     */
    updateData: function() {
        let url = this._baseURL + lon + "/lat/" + lat + "/data.json";
        let msg = Soup.Message.new('GET', url);

        if (!msg)
            new Error("msg null in updateData");

        _session.queue_message(msg, (sess, msg) => {
            _data = msg.response_body.data;
        });
    },

    a: function() {}
};
