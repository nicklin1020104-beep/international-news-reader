// A pragmatic "easy / already known" word list used only to decide which words in an
// article are NOT worth flagging as study vocabulary. Not a scholarly frequency list —
// just common function words + basic everyday vocabulary, assembled by hand.
const COMMON = `
a about above after again against all also am an and any are aren't as at
back be because been before being below between both but by
came can can't come could couldn't
did didn't do does doesn't doing don't down during
each even
few first for from further
get give given go goes going gone good got
had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's
i i'd i'll i'm i've if in into is isn't it it's its itself
just
know known
let let's like little long look
made make many may me might more most much must mustn't my myself
need new no nor not now
of off often on once one only or other ought our ours ourselves out over own
people put
said same say says
shan't she she'd she'll she's should shouldn't so some such
than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too
under until up upon us use used using
very
want was wasn't we we'd we'll we're we've well were weren't what what's when when's where where's which while who who's whom why why's will with within without won't would wouldn't
year years
you you'd you'll you're you've your yours yourself yourselves
also including according last week month year day days weeks months years time times
told said says say saying
new old big small good bad great high low long short
country countries government governments state states city cities
people person man woman men women child children
world nation national international
group groups official officials leader leaders minister ministers president
number percent percentage million billion trillion thousand
month week day monday tuesday wednesday thursday friday saturday sunday
january february march april may june july august september october november december
today yesterday tomorrow morning afternoon evening night
according reported report reports reporter reporting
according plans plan planned announcement announced announce
statement said told
`.split(/\s+/).filter(Boolean);

const COMMON_SET = new Set(COMMON.map((w) => w.toLowerCase()));

module.exports = { COMMON_SET };
