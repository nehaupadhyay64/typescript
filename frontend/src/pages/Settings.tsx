export default function Settings() {
  return <><div className="page-heading"><div><h1>Demo settings</h1><p>These preferences are local to this demo workspace.</p></div></div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><h2>Provider limits</h2><p>Simulated hourly sending capacity</p></div></div><div className="provider-limit"><span><b>128</b> of 200 demo emails sent</span><div><i style={{ width: '64%' }} /></div><small>64% of demo provider capacity used</small></div></section>
      <section className="panel"><div className="panel-head"><div><h2>Demo workspace</h2><p>Data is stored locally in your browser</p></div></div><div className="settings-list"><span>Emails sent <b>Simulated only</b></span><span>Google authentication <b>Not required</b></span><span>Storage <b>localStorage</b></span></div></section></div></>;
}
