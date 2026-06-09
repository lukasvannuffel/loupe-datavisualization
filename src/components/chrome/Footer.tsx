import { Wordmark } from "@/components/primitives/Wordmark";

export const Footer = (): JSX.Element => (
    <footer className="footer surface-navy">
        <div className="container">
            <div className="footer-inner">
                <div>
                    <Wordmark size={20} />
                    <p className="footer-blurb">
                        Publication-ready medical charts, from your finding to a figure — in your browser.
                    </p>
                </div>
                <div>
                    <h5>Product</h5>
                    <ul>
                        <li><a href="#">Create a chart</a></li>
                        <li><a href="#">Supported chart types</a></li>
                        <li><a href="#">Reproducibility</a></li>
                        <li><a href="#">Changelog</a></li>
                    </ul>
                </div>
                <div>
                    <h5>For researchers</h5>
                    <ul>
                        <li><a href="#">Style guidance</a></li>
                        <li><a href="#">Journal presets</a></li>
                        <li><a href="#">Citations</a></li>
                        <li><a href="#">Methods notes</a></li>
                    </ul>
                </div>
                <div>
                    <h5>Institution</h5>
                    <ul>
                        <li><a href="#">About</a></li>
                        <li><a href="#">Privacy architecture</a></li>
                        <li><a href="#">Terms</a></li>
                        <li><a href="#">Contact</a></li>
                    </ul>
                </div>
            </div>
            <div className="footer-meta">
                <span>© 2026 Loupe Research Tools.</span>
                <span className="mono">v0.4.2 · client-side only</span>
            </div>
        </div>
    </footer>
);
