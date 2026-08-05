import { Navigate, useParams, useLocation } from "react-router-dom";

/**
 * Forwards a retired path to its current one, carrying route params across.
 *
 * `<Navigate to="/students/:id">` would navigate to the literal string
 * `/students/:id`, so anything with a parameter needs the substitution below.
 * Query string and hash are preserved too — a link to
 * `/fees?status=OVERDUE` is usually someone's saved filter, and dropping it
 * silently shows them a different list than the one they bookmarked.
 *
 * `replace` keeps the dead path out of history, so Back does not bounce the
 * user through the redirect again.
 */
const LegacyRedirect: React.FC<{ to: string }> = ({ to }) => {
    const params = useParams();
    const { search, hash } = useLocation();

    const target = to.replace(/:([A-Za-z0-9_]+)/g, (whole, key: string) => {
        const value = params[key];
        // A missing param means the redirect table pairs two patterns with
        // different param names. Leaving the token in the URL would be a
        // confusing 404; the domain root is at least a real page.
        return value ?? whole;
    });

    return <Navigate to={`${target}${search}${hash}`} replace />;
};

export default LegacyRedirect;
