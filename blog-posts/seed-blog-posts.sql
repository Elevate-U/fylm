-- Seed data for blog posts with Buzzfeed-style content about movies and shows
-- Run this SQL in your Supabase database to populate the blog with sample posts

-- First, let's create some categories if they don't exist
INSERT INTO blog_categories (name, slug, description, color) VALUES
('Entertainment', 'entertainment', 'Movies, TV shows, and entertainment content', '#FF6B6B'),
('Reviews', 'reviews', 'Movie and TV show reviews', '#4ECDC4'),
('Lists', 'lists', 'Top lists and rankings', '#45B7D1'),
('Analysis', 'analysis', 'Deep dives and analysis', '#96CEB4')
ON CONFLICT (slug) DO NOTHING;

-- Now insert the blog posts
INSERT INTO blog_posts (
    title,
    slug,
    excerpt,
    content,
    category_id,
    status,
    featured_image,
    tags,
    meta_title,
    meta_description,
    author_id
) VALUES
(
    '10 Signs You\'re Definitely a Netflix Binge-Watcher (And We Have the Perfect Shows for You)',
    '10-signs-netflix-binge-watcher',
    'Think you might be a binge-watching addict? Here are the telltale signs that prove you\'re living your best couch potato life.',
    '<h2>Are You a True Binge-Watcher?</h2>
    <p>We\'ve all been there - "just one more episode" turns into an entire season, and suddenly it\'s 3 AM. If you recognize these signs, you\'re officially part of the binge-watching club!</p>
    
    <h3>1. You Plan Your Meals Around Episode Runtime</h3>
    <p>Pizza delivery timing? Perfectly calculated to arrive during the opening credits. You\'ve mastered the art of eating without looking away from the screen.</p>
    <p><strong>Perfect for you:</strong> <a href="/watch/stranger-things">Stranger Things</a> - Long episodes mean more time to enjoy that pizza!</p>
    
    <h3>2. You Have Strong Opinions About Cliffhangers</h3>
    <p>Season finales are your nemesis. You\'ve been personally victimized by showrunners who dare to end on a cliffhanger.</p>
    <p><strong>Perfect for you:</strong> <a href="/watch/breaking-bad">Breaking Bad</a> - Every episode ends with you needing the next one immediately.</p>
    
    <h3>3. You\'ve Perfected the "Are You Still Watching?" Click</h3>
    <p>That Netflix prompt is basically asking if you\'re still breathing. Of course you\'re still watching!</p>
    <p><strong>Perfect for you:</strong> <a href="/watch/the-office">The Office</a> - The ultimate comfort binge that never gets old.</p>
    
    <h3>4. You Know Every Opening Theme by Heart</h3>
    <p>You could conduct an orchestra playing the Game of Thrones theme. You\'ve never skipped an intro in your life.</p>
    <p><strong>Perfect for you:</strong> <a href="/watch/game-of-thrones">Game of Thrones</a> - That theme song hits different every single time.</p>
    
    <h3>5. You\'ve Calculated How Much of Your Life You\'ve Spent Watching</h3>
    <p>And you\'re not even sorry about it. Time enjoyed is never time wasted, right?</p>
    <p><strong>Perfect for you:</strong> <a href="/watch/friends">Friends</a> - 236 episodes of pure comfort viewing.</p>',
    (SELECT id FROM blog_categories WHERE slug = 'entertainment' LIMIT 1),
    'published',
    'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800',
    ARRAY['netflix', 'binge-watching', 'tv-shows', 'streaming'],
    '10 Signs You\'re a Netflix Binge-Watcher | Perfect Shows for You',
    'Discover the telltale signs of being a binge-watcher and find your next perfect show to marathon on Netflix.',
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'Which Marvel Hero Are You Based on Your Streaming Habits?',
    'which-marvel-hero-streaming-habits',
    'Your Netflix queue reveals more about you than you think. Take our quiz to discover which Marvel superhero matches your viewing personality!',
    '<h2>Your Streaming Style = Your Superhero Identity</h2>
    <p>The way you consume content says a lot about your personality. Are you a methodical planner or a chaotic binge-watcher? Let\'s find out which Marvel hero you really are!</p>
    
    <h3>The Strategic Planner: Captain America</h3>
    <p>You watch shows in order, never skip episodes, and always finish what you start. You probably have a spreadsheet tracking your progress.</p>
    <p><strong>Your perfect watch:</strong> <a href="/watch/captain-america-first-avenger">Captain America: The First Avenger</a> - Start from the beginning, just like you always do.</p>
    
    <h3>The Genius Multi-Tasker: Iron Man</h3>
    <p>You\'ve got three screens going at once - laptop, phone, and TV. You can follow complex plots while answering emails.</p>
    <p><strong>Your perfect watch:</strong> <a href="/watch/iron-man">Iron Man</a> - Tech-savvy hero for the tech-savvy viewer.</p>
    
    <h3>The Emotional Roller-Coaster: Scarlet Witch</h3>
    <p>You seek out the shows that will make you cry. If it doesn\'t destroy you emotionally, what\'s the point?</p>
    <p><strong>Your perfect watch:</strong> <a href="/watch/wandavision">WandaVision</a> - Prepare for all the feels.</p>
    
    <h3>The Comedy Seeker: Spider-Man</h3>
    <p>Life\'s too short for serious dramas. You\'re here for laughs, quips, and good vibes only.</p>
    <p><strong>Your perfect watch:</strong> <a href="/watch/spider-man-homecoming">Spider-Man: Homecoming</a> - Humor and heart in perfect balance.</p>
    
    <h3>The Mysterious Binge-Watcher: Black Widow</h3>
    <p>You watch everything in secret. Your viewing history is classified information.</p>
    <p><strong>Your perfect watch:</strong> <a href="/watch/black-widow">Black Widow</a> - For the secretive viewer who appreciates complexity.</p>',
    (SELECT id FROM blog_categories WHERE slug = 'entertainment' LIMIT 1),
    'published',
    'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800',
    ARRAY['marvel', 'quiz', 'personality', 'superhero', 'streaming'],
    'Which Marvel Hero Are You? | Streaming Habits Quiz',
    'Take our fun quiz to discover which Marvel superhero matches your streaming and viewing personality!',
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'We Ranked Every Disney+ Original Series and the Results Will Shock You',
    'disney-plus-original-series-ranked',
    'From The Mandalorian to WandaVision, we\'ve watched them all so you don\'t have to. Here\'s our definitive ranking that\'s sure to spark debate.',
    '<h2>The Ultimate Disney+ Original Series Ranking</h2>
    <p>We\'ve binged every single Disney+ original series (yes, even the ones you forgot existed) and ranked them from "meh" to "masterpiece." Prepare for some hot takes!</p>
    
    <h3>#1: The Mandalorian</h3>
    <p>This is the way. Baby Yoda alone secured this top spot, but the storytelling and production value sealed the deal.</p>
    <p><strong>Watch it here:</strong> <a href="/watch/the-mandalorian">The Mandalorian</a></p>
    
    <h3>#2: WandaVision</h3>
    <p>Mind-bending, heart-breaking, and absolutely brilliant. Elizabeth Olsen deserved all the awards for this one.</p>
    <p><strong>Watch it here:</strong> <a href="/watch/wandavision">WandaVision</a></p>
    
    <h3>#3: Loki</h3>
    <p>Tom Hiddleston\'s charm carries this series through multiverse madness. Plus, that finale? *Chef\'s kiss*</p>
    <p><strong>Watch it here:</strong> <a href="/watch/loki">Loki</a></p>
    
    <h3>#4: The Falcon and The Winter Soldier</h3>
    <p>Action-packed and emotionally resonant. Anthony Mackie and Sebastian Stan\'s chemistry is unmatched.</p>
    <p><strong>Watch it here:</strong> <a href="/watch/falcon-winter-soldier">The Falcon and The Winter Soldier</a></p>
    
    <h3>#5: Hawkeye</h3>
    <p>Jeremy Renner finally gets his moment to shine, and Hailee Steinfeld is the perfect protégé.</p>
    <p><strong>Watch it here:</strong> <a href="/watch/hawkeye">Hawkeye</a></p>
    
    <p><em>Disagree with our ranking? Let us know in the comments which series you think deserves the top spot!</em></p>',
    (SELECT id FROM blog_categories WHERE slug = 'reviews' LIMIT 1),
    'published',
    'https://images.unsplash.com/photo-1489599735734-79b4169c4388?w=800',
    ARRAY['disney-plus', 'ranking', 'original-series', 'streaming'],
    'Disney+ Original Series Ranked | Definitive List',
    'Our complete ranking of every Disney+ original series from worst to best. See where your favorites landed!',
    (SELECT id FROM auth.users LIMIT 1)
),
(
    '15 Plot Holes in Popular Movies That Will Ruin Your Day',
    '15-plot-holes-popular-movies',
    'We love these movies, but we can\'t unsee these glaring plot holes. Sorry in advance for ruining your favorite films.',
    '<h2>Plot Holes That Will Haunt Your Dreams</h2>
    <p>Sometimes ignorance is bliss. But since you\'re here, let\'s dive into the plot holes that will make you question everything you thought you knew about your favorite movies.</p>
    
    <h3>1. The Dark Knight Rises: Batman\'s Magical Recovery</h3>
    <p>Bruce Wayne goes from broken back to superhero in what appears to be a few weeks. Either Gotham has the world\'s best physical therapy or we missed something.</p>
    <p><strong>Rewatch and cringe:</strong> <a href="/watch/dark-knight-rises">The Dark Knight Rises</a></p>
    
    <h3>2. Avengers: Endgame: The Time Travel Rules</h3>
    <p>The movie establishes its own time travel rules and then promptly ignores them. We\'re still confused about that Captain America ending.</p>
    <p><strong>Rewatch and overthink:</strong> <a href="/watch/avengers-endgame">Avengers: Endgame</a></p>
    
    <h3>3. Star Wars: A New Hope: The Death Star Plans</h3>
    <p>The Empire\'s ultimate weapon has a convenient exhaust port that leads directly to the reactor. Who approved this design?</p>
    <p><strong>Rewatch and question:</strong> <a href="/watch/star-wars-new-hope">Star Wars: A New Hope</a></p>
    
    <h3>4. The Matrix: The Human Battery Theory</h3>
    <p>Using humans as batteries violates basic thermodynamics. The machines would get more energy from literally anything else.</p>
    <p><strong>Rewatch and ponder:</strong> <a href="/watch/the-matrix">The Matrix</a></p>
    
    <h3>5. Toy Story: The Toy Rules</h3>
    <p>Toys can\'t move when humans are watching, except when they can. The rules seem to change based on plot convenience.</p>
    <p><strong>Rewatch and analyze:</strong> <a href="/watch/toy-story">Toy Story</a></p>
    
    <p><em>We still love these movies despite their flaws. Sometimes you just have to turn off your brain and enjoy the ride!</em></p>',
    (SELECT id FROM blog_categories WHERE slug = 'analysis' LIMIT 1),
    'published',
    'https://images.unsplash.com/photo-1489599735734-79b4169c4388?w=800',
    ARRAY['plot-holes', 'movies', 'analysis', 'film-criticism'],
    '15 Plot Holes in Popular Movies | Film Analysis',
    'Discover the most glaring plot holes in beloved movies that you probably never noticed before.',
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'Tell Us Your Favorite Rom-Com and We\'ll Predict Your Love Life',
    'favorite-rom-com-predict-love-life',
    'Your taste in romantic comedies reveals everything about your approach to love. Let\'s see what your favorite says about your romantic future!',
    '<h2>Your Rom-Com Choice = Your Love Story</h2>
    <p>The romantic comedies we love say more about us than we\'d like to admit. Are you a hopeless romantic or a cynical realist? Let\'s find out!</p>
    
    <h3>The Notebook Lovers: You\'re a Hopeless Romantic</h3>
    <p>You believe in grand gestures, true love, and happily ever after. Your love life prediction: You\'ll find your Noah, but maybe tone down the expectations just a tiny bit.</p>
    <p><strong>Your perfect rewatch:</strong> <a href="/watch/the-notebook">The Notebook</a></p>
    
    <h3>When Harry Met Sally Fans: You\'re Friendship-First</h3>
    <p>You believe the best relationships start as friendships. Your love life prediction: Your best friend might just be "the one" - have you considered it?</p>
    <p><strong>Your perfect rewatch:</strong> <a href="/watch/when-harry-met-sally">When Harry Met Sally</a></p>
    
    <h3>10 Things I Hate About You Enthusiasts: You Like the Chase</h3>
    <p>You\'re attracted to complexity and a little drama. Your love life prediction: You\'ll fall for someone who challenges you intellectually.</p>
    <p><strong>Your perfect rewatch:</strong> <a href="/watch/10-things-i-hate-about-you">10 Things I Hate About You</a></p>
    
    <h3>Crazy, Stupid, Love Devotees: You\'re Realistically Romantic</h3>
    <p>You know love is messy but beautiful. Your love life prediction: You\'ll have a few plot twists, but the ending will be worth it.</p>
    <p><strong>Your perfect rewatch:</strong> <a href="/watch/crazy-stupid-love">Crazy, Stupid, Love</a></p>
    
    <h3>The Princess Bride Worshippers: You Want Adventure</h3>
    <p>True love AND adventure? Yes, please. Your love life prediction: Your relationship will be anything but boring.</p>
    <p><strong>Your perfect rewatch:</strong> <a href="/watch/the-princess-bride">The Princess Bride</a></p>',
    (SELECT id FROM blog_categories WHERE slug = 'entertainment' LIMIT 1),
    'published',
    'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800',
    ARRAY['rom-com', 'quiz', 'love', 'relationships', 'movies'],
    'Rom-Com Quiz: Predict Your Love Life | Movie Personality Test',
    'Take our fun quiz to see what your favorite romantic comedy reveals about your love life and romantic future!',
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'The 7 Stages of Watching a Series Finale (And Why We\'re Never Ready)',
    '7-stages-watching-series-finale',
    'From denial to acceptance, here\'s the emotional journey we all take when our favorite show comes to an end. Spoiler alert: tissues required.',
    '<h2>The Emotional Rollercoaster of Series Finales</h2>
    <p>We\'ve all been there - that moment when you realize you\'re about to watch the last episode of your favorite show. Here\'s the inevitable emotional journey we all take.</p>
    
    <h3>Stage 1: Denial</h3>
    <p>"This can\'t be the last episode. There has to be more. Maybe there\'s a secret season they haven\'t announced yet."</p>
    <p><strong>Currently in denial about:</strong> <a href="/watch/game-of-thrones">Game of Thrones</a> (we\'re still hoping for a do-over)</p>
    
    <h3>Stage 2: Bargaining</h3>
    <p>"If I watch really slowly and pause every few minutes, I can make this last forever, right?"</p>
    <p><strong>Worth savoring:</strong> <a href="/watch/breaking-bad">Breaking Bad</a> - That finale deserves to be watched frame by frame</p>
    
    <h3>Stage 3: Anger</h3>
    <p>"How DARE they end it like this? I have so many unanswered questions! This is personally offensive to me!"</p>
    <p><strong>Still angry about:</strong> <a href="/watch/lost">Lost</a> - We\'re looking at you, polar bear explanation</p>
    
    <h3>Stage 4: Depression</h3>
    <p>"What\'s the point of anything now? How do I fill this void in my soul? Nothing will ever be the same."</p>
    <p><strong>Caused major depression:</strong> <a href="/watch/the-office">The Office</a> - Michael Scott\'s goodbye still hurts</p>
    
    <h3>Stage 5: Acceptance</h3>
    <p>"Okay, it\'s over. But what a journey it was. I\'m grateful for the time we had together."</p>
    <p><strong>Peaceful acceptance:</strong> <a href="/watch/friends">Friends</a> - Could this ending BE any more perfect?</p>
    
    <h3>Stage 6: Nostalgia</h3>
    <p>"Remember when we first met these characters? Look how far we\'ve all come together."</p>
    
    <h3>Stage 7: The Rewatch</h3>
    <p>"Time to start from episode one and experience it all over again. Maybe I\'ll catch things I missed the first time."</p>
    
    <p><em>The cycle continues. And honestly? We wouldn\'t have it any other way.</em></p>',
    (SELECT id FROM blog_categories WHERE slug = 'entertainment' LIMIT 1),
    'published',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    ARRAY['series-finale', 'emotions', 'tv-shows', 'binge-watching'],
    '7 Stages of Watching a Series Finale | TV Show Emotions',
    'The emotional journey every TV fan experiences when watching their favorite show come to an end.',
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'Which Streaming Service Are You? Take This Quiz to Find Out',
    'which-streaming-service-quiz',
    'Netflix? Disney+? HBO Max? Your personality perfectly matches one of these streaming giants. Take our quiz to discover your streaming soulmate!',
    '<h2>Find Your Streaming Service Match</h2>
    <p>Every streaming service has its own personality, and so do you! Let\'s see which platform matches your viewing style and life philosophy.</p>
    
    <h3>You\'re Netflix if...</h3>
    <p>You\'re reliable, diverse, and always have something for everyone. You\'re the friend who can recommend a show for any mood.</p>
    <p><strong>Your signature content:</strong> <a href="/watch/stranger-things">Stranger Things</a>, <a href="/watch/the-crown">The Crown</a>, <a href="/watch/squid-game">Squid Game</a></p>
    
    <h3>You\'re Disney+ if...</h3>
    <p>You\'re nostalgic, family-oriented, and believe in magic. You probably still cry during Pixar movies (and that\'s okay!).</p>
    <p><strong>Your signature content:</strong> <a href="/watch/the-mandalorian">The Mandalorian</a>, <a href="/watch/encanto">Encanto</a>, <a href="/watch/wandavision">WandaVision</a></p>
    
    <h3>You\'re HBO Max if...</h3>
    <p>You\'re sophisticated, appreciate quality over quantity, and aren\'t afraid of complex narratives. You probably use the word "prestige" unironically.</p>
    <p><strong>Your signature content:</strong> <a href="/watch/succession">Succession</a>, <a href="/watch/the-last-of-us">The Last of Us</a>, <a href="/watch/euphoria">Euphoria</a></p>
    
    <h3>You\'re Amazon Prime if...</h3>
    <p>You\'re practical and efficient. You probably signed up for the free shipping and discovered the content by accident.</p>
    <p><strong>Your signature content:</strong> <a href="/watch/the-boys">The Boys</a>, <a href="/watch/marvelous-mrs-maisel">The Marvelous Mrs. Maisel</a></p>
    
    <h3>You\'re Apple TV+ if...</h3>
    <p>You\'re selective, appreciate quality production values, and don\'t mind a smaller catalog if everything is excellent.</p>
    <p><strong>Your signature content:</strong> <a href="/watch/ted-lasso">Ted Lasso</a>, <a href="/watch/severance">Severance</a>, <a href="/watch/the-morning-show">The Morning Show</a></p>',
    (SELECT id FROM blog_categories WHERE slug = 'entertainment' LIMIT 1),
    'published',
    'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800',
    ARRAY['streaming', 'quiz', 'personality', 'netflix', 'disney-plus'],
    'Which Streaming Service Are You? | Personality Quiz',
    'Take our fun quiz to discover which streaming service matches your personality and viewing preferences!',
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'We Watched Every Marvel Movie in Chronological Order and Here\'s What We Learned',
    'marvel-movies-chronological-order-marathon',
    'We spent 50+ hours watching the entire MCU in timeline order. Here are the surprising discoveries, plot connections, and sanity-testing moments.',
    '<h2>The Ultimate MCU Marathon Experience</h2>
    <p>Armed with snacks, caffeine, and questionable life choices, we embarked on the ultimate Marvel Cinematic Universe marathon. Here\'s what 50+ hours of superhero content taught us.</p>
    
    <h3>Captain America: The First Avenger Hits Different</h3>
    <p>Starting with Cap instead of Iron Man completely changes the experience. Suddenly, every modern reference feels like a revelation.</p>
    <p><strong>Start your journey:</strong> <a href="/watch/captain-america-first-avenger">Captain America: The First Avenger</a></p>
    
    <h3>The Infinity Stones Are EVERYWHERE</h3>
    <p>Once you know what to look for, the Infinity Stones pop up constantly. We counted at least 47 references before they became plot-relevant.</p>
    <p><strong>Stone spotting starts here:</strong> <a href="/watch/thor">Thor</a></p>
    
    <h3>Tony Stark\'s Character Arc is a Masterpiece</h3>
    <p>Watching his journey from selfish billionaire to ultimate sacrifice in one sitting is emotionally devastating in the best way.</p>
    <p><strong>Begin the feels:</strong> <a href="/watch/iron-man">Iron Man</a></p>
    
    <h3>The TV Shows Actually Matter</h3>
    <p>Agents of S.H.I.E.L.D. and the Netflix shows add so much context. Yes, even Iron Fist (we said what we said).</p>
    <p><strong>Essential viewing:</strong> <a href="/watch/agents-of-shield">Agents of S.H.I.E.L.D.</a></p>
    
    <h3>Phase 4 Makes More Sense</h3>
    <p>The multiverse madness feels less chaotic when you\'ve just lived through 23 movies of buildup.</p>
    <p><strong>Multiverse begins:</strong> <a href="/watch/loki">Loki</a></p>
    
    <h3>Our Sanity Status: Questionable</h3>
    <p>Would we do it again? Absolutely. Would we recommend it? Only if you have a very understanding support system.</p>
    
    <p><em>Pro tip: Spread it over a month, not a weekend. Trust us on this one.</em></p>',
    (SELECT id FROM blog_categories WHERE slug = 'reviews' LIMIT 1),
    'published',
    'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800',
    ARRAY['marvel', 'mcu', 'marathon', 'chronological', 'movies'],
    'Marvel Movies Chronological Order Marathon | MCU Experience',
    'Our complete experience watching every Marvel movie in chronological order and what we discovered along the way.',
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'The Definitive Ranking of Every Friends Episode (All 236 of Them)',
    'definitive-ranking-friends-episodes',
    'We ranked every single Friends episode from "meh" to "iconic." Prepare for some controversial takes and nostalgic feels.',
    '<h2>All 236 Friends Episodes, Ranked</h2>
    <p>After countless hours of analysis, debate, and probably too much coffee, we\'ve ranked every Friends episode. Could this BE any more comprehensive?</p>
    
    <h3>Top 10 Episodes That Define the Series</h3>
    
    <h4>#1: "The One Where Everybody Finds Out" (Season 5)</h4>
    <p>Phoebe discovering Monica and Chandler is peak Friends comedy. "They don\'t know that we know they know we know!"</p>
    <p><strong>Rewatch this masterpiece:</strong> <a href="/watch/friends">Friends Season 5</a></p>
    
    <h4>#2: "The Last One" (Season 10 Finale)</h4>
    <p>The perfect ending to a perfect series. We\'re not crying, you\'re crying.</p>
    
    <h4>#3: "The One with the Embryos" (Season 4)</h4>
    <p>The apartment bet episode that changed everything. Plus, Phoebe\'s pregnancy storyline begins.</p>
    
    <h4>#4: "The One with the Prom Video" (Season 2)</h4>
    <p>"He\'s her lobster!" This episode gave us one of the most romantic moments in TV history.</p>
    
    <h4>#5: "The One Where No One\'s Ready" (Season 2)</h4>
    <p>Real-time chaos as everyone gets ready for Ross\'s event. Comedy gold from start to finish.</p>
    
    <h3>The Most Controversial Rankings</h3>
    
    <h4>"The One with the Holiday Armadillo" - #47</h4>
    <p>We know, we know. Ross as the Holiday Armadillo should rank higher, but the execution was just okay.</p>
    
    <h4>"The One After Vegas" - #89</h4>
    <p>The drunk marriage aftermath felt forced. Even great shows have off episodes.</p>
    
    <h3>Hidden Gems You Probably Forgot</h3>
    
    <h4>"The One with the Blackout" - #12</h4>
    <p>The citywide blackout episode showcases each character perfectly in crisis mode.</p>
    
    <h4>"The One with the Football" - #18</h4>
    <p>Thanksgiving football brings out everyone\'s competitive side. The Geller Cup is serious business.</p>
    
    <p><strong>Start your Friends rewatch:</strong> <a href="/watch/friends">Friends Complete Series</a></p>
    
    <p><em>Disagree with our rankings? That\'s what makes Friends discussions so fun! Share your top episodes in the comments.</em></p>',
    (SELECT id FROM blog_categories WHERE slug = 'lists' LIMIT 1),
    'published',
    'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800',
    ARRAY['friends', 'ranking', 'episodes', 'tv-shows', 'sitcom'],
    'Every Friends Episode Ranked | Complete List of 236 Episodes',
    'Our definitive ranking of all 236 Friends episodes from worst to best. See where your favorites landed!',
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'Choose Your Favorite Horror Movie and We\'ll Reveal Your Deepest Fear',
    'horror-movie-reveals-deepest-fear',
    'Your horror movie preferences say more about your psyche than you realize. Let\'s dive into what scares you most and why you love it.',
    '<h2>What Your Horror Taste Says About You</h2>
    <p>The horror movies that terrify us reveal our deepest anxieties. Are you afraid of the unknown, losing control, or something else entirely? Let\'s find out!</p>
    
    <h3>The Conjuring Fans: You Fear the Unknown</h3>
    <p>Supernatural horror speaks to your fear of forces beyond your control. You\'re logical, but you know there are things science can\'t explain.</p>
    <p><strong>Your perfect scare:</strong> <a href="/watch/the-conjuring">The Conjuring</a></p>
    <p><strong>Your deepest fear:</strong> The things you can\'t see or understand</p>
    
    <h3>Get Out Enthusiasts: You Fear Social Manipulation</h3>
    <p>Psychological horror hits you hardest because you understand how easily people can be manipulated and controlled.</p>
    <p><strong>Your perfect scare:</strong> <a href="/watch/get-out">Get Out</a></p>
    <p><strong>Your deepest fear:</strong> Being trapped by people you trusted</p>
    
    <h3>Halloween Devotees: You Fear Unstoppable Evil</h3>
    <p>Slasher films represent your fear of relentless, motiveless evil. You know that sometimes bad things happen for no reason.</p>
    <p><strong>Your perfect scare:</strong> <a href="/watch/halloween">Halloween</a></p>
    <p><strong>Your deepest fear:</strong> Evil that can\'t be reasoned with or stopped</p>
    
    <h3>Hereditary Lovers: You Fear Family Dysfunction</h3>
    <p>Family horror terrifies you because it corrupts the one place that should feel safe. Your worst nightmare is your loved ones turning against you.</p>
    <p><strong>Your perfect scare:</strong> <a href="/watch/hereditary">Hereditary</a></p>
    <p><strong>Your deepest fear:</strong> The people closest to you becoming strangers</p>
    
    <h3>A Quiet Place Fans: You Fear Helplessness</h3>
    <p>Monster movies represent your fear of being powerless against overwhelming odds. You hate feeling like you can\'t protect yourself or others.</p>
    <p><strong>Your perfect scare:</strong> <a href="/watch/a-quiet-place">A Quiet Place</a></p>
    <p><strong>Your deepest fear:</strong> Being unable to save the people you love</p>
    
    <p><em>Remember: It\'s healthy to explore our fears through fiction. Horror movies let us experience terror safely!</em></p>',
    (SELECT id FROM blog_categories WHERE slug = 'entertainment' LIMIT 1),
    'published',
    'https://images.unsplash.com/photo-1509266272358-7701da638078?w=800',
    ARRAY['horror', 'psychology', 'fear', 'movies', 'quiz'],
    'Horror Movie Quiz: What Your Favorite Reveals About You',
    'Discover what your favorite horror movie reveals about your deepest fears and psychological makeup.',
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'The Sequel Spectrum: From Disaster to Masterpiece',
    'sequel-spectrum-disaster-to-masterpiece',
    'For every Godfather Part II, there\'s a Jaws: The Revenge. We\'ve ranked movie sequels on the official scale of "Why?" to "More please!"',
    '<h2>The Sequel Spectrum: From Disaster to Masterpiece</h2>
    <p>For every <a href="#/movie/240">Godfather Part II</a>, there\'s a Jaws: The Revenge. We\'ve ranked movie sequels on the official scale of "Why?" to "More please!"</p>
    
    <h3>🏆 "Better Than the Original" Tier</h3>
    
    <p><strong><a href="#/movie/280">Terminator 2: Judgment Day</a></strong> - James Cameron said "hold my beer" and created perfection.</p>
    
    <p><strong><a href="#/movie/155">The Dark Knight</a></strong> - Heath Ledger\'s Joker elevated superhero movies forever.</p>
    
    <p><strong><a href="#/movie/863">Toy Story 2</a></strong> - Pixar proving that sequels can have heart and soul.</p>
    
    <h3>🥇 "Worthy Successor" Tier</h3>
    
    <p><strong><a href="#/movie/679">Aliens</a></strong> - Ridley Scott made horror, James Cameron made action. Both worked.</p>
    
    <p><strong><a href="#/movie/558">Spider-Man 2</a></strong> - Tobey Maguire at his peak, Doc Ock at his most terrifying.</p>
    
    <p><strong><a href="#/movie/324552">John Wick: Chapter 2</a></strong> - More dogs, more pencils, more perfectly choreographed violence.</p>
    
    <h3>😐 "It\'s Fine, I Guess" Tier</h3>
    
    <p><strong><a href="#/movie/10138">Iron Man 2</a></strong> - Not bad, just... there. Mickey Rourke tried his best.</p>
    
    <p><strong><a href="#/movie/86834">The Hangover Part II</a></strong> - The exact same movie in a different location. Points for consistency?</p>
    
    <h3>🗑️ "Why Does This Exist?" Tier</h3>
    
    <p><strong>Jaws: The Revenge</strong> - A shark with a personal vendetta. We\'re not linking this one.</p>
    
    <p><strong><a href="#/movie/415">Batman & Robin</a></strong> - Bat-nipples. That\'s all we need to say.</p>
    
    <h3>🤔 "So Bad It\'s Good" Tier</h3>
    
    <p><strong><a href="#/movie/385687">F9: The Fast Saga</a></strong> - Physics left the chat around movie 5, but we\'re still here for it.</p>
    
    <h3>🎬 How to Watch Movies for Free</h3>
    
    <p>Looking for ways to enjoy these sequels without breaking the bank? Here are 5 legitimate ways to watch movies for free:</p>
    
    <h4>1. Library Digital Collections</h4>
    <p>Most public libraries offer free streaming through services like Kanopy and Hoopla. Just need your library card!</p>
    
    <h4>2. Free Streaming Platforms</h4>
    <p>Tubi, Crackle, and Pluto TV offer thousands of movies with ads - completely legal and free.</p>
    
    <h4>3. Studio YouTube Channels</h4>
    <p>Many studios upload full movies to YouTube for free viewing. Check official channels regularly.</p>
    
    <h4>4. Free Trials</h4>
    <p>Rotate through streaming service free trials - just remember to cancel before billing starts!</p>
    
    <h4>5. Community Events</h4>
    <p>Parks, libraries, and community centers often host free movie nights, especially during summer.</p>
    
    <p><em>Remember: Great sequels are worth watching, terrible sequels are worth mocking. Either way, you win!</em></p>',
    (SELECT id FROM blog_categories WHERE slug = 'lists' LIMIT 1),
    'published',
    'https://images.unsplash.com/photo-1489599735734-79b4169c4388?w=800',
    ARRAY['sequels', 'movies', 'ranking', 'film-analysis', 'free-movies'],
    'Movie Sequels Ranked: From Disaster to Masterpiece | Free Viewing Guide',
    'Our definitive ranking of movie sequels from terrible to amazing, plus 5 ways to watch movies for free legally.',
    (SELECT id FROM auth.users LIMIT 1)
);

-- Update the author_id to use the first admin user if available
UPDATE blog_posts 
SET author_id = (
    SELECT p.id 
    FROM profiles p 
    WHERE p.role = 'admin' 
    LIMIT 1
)
WHERE author_id = (SELECT id FROM auth.users LIMIT 1);

-- If no admin user exists, keep the first user as author
-- This ensures the posts have a valid author_id