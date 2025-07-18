import{a as te,b as ae,$ as ie,u as t,L as ne,A as E}from"./index-CanNQZLm.js";import{d as n,A as re,y as T,q as R}from"./react-vendor-BYlzYzcd.js";import{M}from"./MovieCard-3dEF2ck3.js";/* empty css             */const ye=()=>{const[C,w]=n(!0),[I,W]=n([]),[L,Q]=n([]),[k,G]=n([]),[_,F]=n([]),[$,V]=n([]),[A,d]=n(null),[g,b]=n(0),[B,H]=n(()=>localStorage.getItem("anime-audio-preference")||"subbed"),[se,oe]=n(null),[le,ce]=n(null),[de,ue]=n(!1),[f,J]=n(!0),[m,S]=n(!0),P=re({requests:[],maxRequests:90,timeWindow:6e4}),{user:q}=te(),{continueWatching:z,continueWatchingFetched:x,fetchContinueWatching:O}=ae();T(()=>{q&&!x&&O()},[q,x,O]);const N=z.filter(e=>e.type==="anime"),K=R(()=>{const e=Date.now(),{requests:a,maxRequests:i,timeWindow:l}=P.current,r=a.filter(o=>e-o<l);if(P.current.requests=r,r.length>=i){const o=Math.min(...r);return{allowed:!1,waitTime:l-(e-o)}}return P.current.requests.push(e),{allowed:!0,waitTime:0}},[]),u=async(e,a={},i=3)=>{const l=K();l.allowed||(console.warn(`Rate limit exceeded. Waiting ${l.waitTime}ms`),await new Promise(r=>setTimeout(r,l.waitTime)));try{const r=new AbortController,o=setTimeout(()=>r.abort(),1e4),s=await fetch(`${E}/anilist`,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({query:e,variables:a}),signal:r.signal});if(clearTimeout(o),!s.ok){if(s.status===429){const y=s.headers.get("Retry-After")||60;if(console.warn(`Server rate limit hit. Retrying after ${y}s`),await new Promise(v=>setTimeout(v,y*1e3)),i>0)return u(e,a,i-1)}throw new Error(`AniList API error: ${s.status}`)}const c=await s.json();if(c.errors)throw console.error("AniList GraphQL errors:",c.errors),new Error("GraphQL errors in response");return S(!0),c}catch(r){if(console.error("Error fetching from AniList:",r),r.name==="AbortError")d("Request timed out. Please check your connection.");else{if(i>0)return console.log(`Retrying AniList request. ${i} attempts remaining.`),await new Promise(o=>setTimeout(o,1e3*(4-i))),u(e,a,i-1);S(!1),d("AniList service temporarily unavailable. Some features may be limited.")}return null}},h=e=>({id:e.id,title:e.title.english||e.title.romaji,name:e.title.english||e.title.romaji,poster_path:e.coverImage.large,overview:e.description?e.description.replace(/<[^>]*>/g,""):"",vote_average:e.averageScore?e.averageScore/10:0,popularity:e.popularity||0,first_air_date:e.startDate?`${e.startDate.year}-${e.startDate.month||"01"}-${e.startDate.day||"01"}`:"",media_type:"anime",anilist_id:e.id,seasons:e.format==="MOVIE"?[]:[{season_number:1}],genres:e.genres||[],studios:e.studios?.nodes||[],episodes:e.episodes,duration:e.duration,status:e.status,format:e.format,season:e.season,seasonYear:e.seasonYear,source:e.source,hashtag:e.hashtag,trailer:e.trailer,isAdult:e.isAdult,meanScore:e.meanScore,favourites:e.favourites,tags:e.tags||[],relations:e.relations?.edges||[],nextAiringEpisode:e.nextAiringEpisode}),U=R(e=>{if(e.media_type==="anime"||e.type==="anime"){const a=e.anilist_id||e.id;f?ie(`/watch/anime/${a}`):d("Streaming service temporarily unavailable. Please try again later.")}},[f]),X=R(e=>{H(e),localStorage.setItem("anime-audio-preference",e)},[]),Y=async()=>{try{const e=await fetch(`${E}/health/videasy`,{method:"GET",signal:AbortSignal.timeout(5e3)});J(e.ok);const a=await fetch(`${E}/health/anilist`,{method:"GET",signal:AbortSignal.timeout(5e3)});S(a.ok)}catch(e){console.warn("Service availability check failed:",e)}};T(()=>{Y()},[]),T(()=>{const e=async()=>{w(!0),d(null);const a=`
                query {
                    Page(page: 1, perPage: 20) {
                        media(type: ANIME, sort: TRENDING_DESC) {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            coverImage {
                                large
                                medium
                                color
                            }
                            bannerImage
                            description
                            averageScore
                            meanScore
                            popularity
                            favourites
                            startDate {
                                year
                                month
                                day
                            }
                            endDate {
                                year
                                month
                                day
                            }
                            format
                            status
                            episodes
                            duration
                            genres
                            season
                            seasonYear
                            source
                            hashtag
                            isAdult
                            trailer {
                                id
                                site
                                thumbnail
                            }
                            studios {
                                nodes {
                                    id
                                    name
                                }
                            }
                            tags {
                                id
                                name
                                rank
                            }
                            nextAiringEpisode {
                                airingAt
                                timeUntilAiring
                                episode
                            }
                        }
                    }
                }
            `,i=`
                query {
                    Page(page: 1, perPage: 20) {
                        media(type: ANIME, sort: POPULARITY_DESC) {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            coverImage {
                                large
                                medium
                                color
                            }
                            bannerImage
                            description
                            averageScore
                            meanScore
                            popularity
                            favourites
                            startDate {
                                year
                                month
                                day
                            }
                            endDate {
                                year
                                month
                                day
                            }
                            format
                            status
                            episodes
                            duration
                            genres
                            season
                            seasonYear
                            source
                            hashtag
                            isAdult
                            trailer {
                                id
                                site
                                thumbnail
                            }
                            studios {
                                nodes {
                                    id
                                    name
                                }
                            }
                            tags {
                                id
                                name
                                rank
                            }
                            nextAiringEpisode {
                                airingAt
                                timeUntilAiring
                                episode
                            }
                        }
                    }
                }
            `,l=`
                query {
                    Page(page: 1, perPage: 20) {
                        media(type: ANIME, sort: SCORE_DESC) {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            coverImage {
                                large
                                medium
                                color
                            }
                            bannerImage
                            description
                            averageScore
                            meanScore
                            popularity
                            favourites
                            startDate {
                                year
                                month
                                day
                            }
                            endDate {
                                year
                                month
                                day
                            }
                            format
                            status
                            episodes
                            duration
                            genres
                            season
                            seasonYear
                            source
                            hashtag
                            isAdult
                            trailer {
                                id
                                site
                                thumbnail
                            }
                            studios {
                                nodes {
                                    id
                                    name
                                }
                            }
                            tags {
                                id
                                name
                                rank
                            }
                            nextAiringEpisode {
                                airingAt
                                timeUntilAiring
                                episode
                            }
                        }
                    }
                }
            `,r=`
                query {
                    Page(page: 1, perPage: 20) {
                        media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            coverImage {
                                large
                                medium
                                color
                            }
                            bannerImage
                            description
                            averageScore
                            meanScore
                            popularity
                            favourites
                            startDate {
                                year
                                month
                                day
                            }
                            endDate {
                                year
                                month
                                day
                            }
                            format
                            status
                            episodes
                            duration
                            genres
                            season
                            seasonYear
                            source
                            hashtag
                            isAdult
                            trailer {
                                id
                                site
                                thumbnail
                            }
                            studios {
                                nodes {
                                    id
                                    name
                                }
                            }
                            tags {
                                id
                                name
                                rank
                            }
                            nextAiringEpisode {
                                airingAt
                                timeUntilAiring
                                episode
                            }
                        }
                    }
                }
            `,o=`
                query {
                    Page(page: 1, perPage: 20) {
                        media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            coverImage {
                                large
                                medium
                                color
                            }
                            bannerImage
                            description
                            averageScore
                            meanScore
                            popularity
                            favourites
                            startDate {
                                year
                                month
                                day
                            }
                            endDate {
                                year
                                month
                                day
                            }
                            format
                            status
                            episodes
                            duration
                            genres
                            season
                            seasonYear
                            source
                            hashtag
                            isAdult
                            trailer {
                                id
                                site
                                thumbnail
                            }
                            studios {
                                nodes {
                                    id
                                    name
                                }
                            }
                            tags {
                                id
                                name
                                rank
                            }
                            nextAiringEpisode {
                                airingAt
                                timeUntilAiring
                                episode
                            }
                        }
                    }
                }
            `;try{if(!m){d("AniList service is currently unavailable. Please try again later."),w(!1);return}const[s,c,y,v,j]=await Promise.all([u(a),u(i),u(l),u(r),u(o)]);s?.data&&G(s.data.Page.media.map(h)),c?.data&&Q(c.data.Page.media.map(h)),y?.data&&W(y.data.Page.media.map(h)),v?.data&&F(v.data.Page.media.map(h)),j?.data&&V(j.data.Page.media.map(h)),b(0)}catch(s){console.error("Error fetching anime data:",s),g<3?(b(c=>c+1),setTimeout(()=>{e()},2e3*(g+1))):d("Failed to load anime data after multiple attempts. Please refresh the page.")}finally{w(!1)}};e()},[m,g]);const p=(e,a)=>!a||a.length===0?null:t("section",{class:"home-section",children:[t("h2",{children:e}),t("div",{class:"scrolling-row",children:a.map(i=>t(M,{item:i,type:"anime",onClick:()=>U(i)},`${e}-${i.id}`))})]}),D=()=>t("div",{class:"service-status",children:[t("div",{class:`status-indicator ${m?"online":"offline"}`,children:[t("span",{class:"status-dot"}),"AniList: ",m?"Online":"Offline"]}),t("div",{class:`status-indicator ${f?"online":"offline"}`,children:[t("span",{class:"status-dot"}),"Videasy: ",f?"Online":"Offline"]})]}),Z=()=>t("div",{class:"audio-preference-selector",children:[t("label",{htmlFor:"audio-preference",children:"Default Audio:"}),t("select",{id:"audio-preference",value:B,onChange:e=>X(e.target.value),class:"audio-select",children:[t("option",{value:"subbed",children:"Subtitled (Sub)"}),t("option",{value:"dubbed",children:"Dubbed (Dub)"})]}),t("small",{class:"preference-note",children:"This preference will be applied when watching anime episodes"})]}),ee=({error:e,onRetry:a})=>t("div",{class:"error-container",children:[t("div",{class:"error-message",children:[t("h3",{children:"Something went wrong"}),t("p",{children:e}),t("div",{class:"error-actions",children:[t("button",{onClick:a,class:"retry-button",children:"Try Again"}),t("button",{onClick:()=>window.location.reload(),class:"refresh-button",children:"Refresh Page"})]})]}),t(D,{})]});return C?t("div",{class:"container home-page anime-page",children:[t("h1",{class:"main-title",children:"Anime"}),t(D,{}),t(ne,{text:"Loading anime data..."}),g>0&&t("p",{class:"retry-info",children:["Retrying... (Attempt ",g+1,"/4)"]})]}):A&&!m?t("div",{class:"container home-page anime-page",children:[t("h1",{class:"main-title",children:"Anime"}),t(ee,{error:A,onRetry:()=>{d(null),b(0),Y()}})]}):t("div",{class:"container home-page anime-page",children:[t("h1",{class:"main-title",children:"Anime"}),t("div",{class:"anime-controls",children:[t(Z,{}),t(D,{})]}),A&&t("div",{class:"warning-message",children:t("p",{children:A})}),N.length>0&&t("section",{class:"home-section",children:[t("h2",{children:"Continue Watching"}),t("div",{class:"scrolling-row scrolling-row--compact",children:N.map(e=>t(M,{item:e,type:"anime",progress:e.progress_seconds,duration:e.duration_seconds,onClick:()=>U(e)},`continue-watching-${e.id}`))})]}),p("Trending Anime",k),p("Currently Airing",_),p("Popular Anime",L),p("Top Rated Anime",I),p("Upcoming Anime",$),!C&&k.length===0&&L.length===0&&I.length===0&&_.length===0&&$.length===0&&t("div",{class:"no-content",children:[t("h3",{children:"No anime content available"}),t("p",{children:"Please check your connection and try again."}),t("button",{onClick:()=>window.location.reload(),class:"retry-button",children:"Refresh Page"})]})]})};export{ye as default};
//# sourceMappingURL=Anime-Cw-De89L.js.map
