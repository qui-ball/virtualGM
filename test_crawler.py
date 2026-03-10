from firecrawl import FirecrawlApp

app = FirecrawlApp(api_key="fc-d307fb4f87334ecda35ef0e5433fb8af")

print("Starting crawl...")
result = app.crawl(
    "https://www.dndbeyond.com/sources/dnd/lmop",
    limit=30,
    include_paths=["sources/dnd/lmop/*"],
    exclude_paths=["sources/dnd/lmop/credits"],
    scrape_options={
        "formats": ["markdown"],
        "headers": {
            "Cookie": """_swb=c2c1dd32-ab43-4fd6-8d72-976958a8d41b; ddb_vid=571ec817-b8f5-4b9b-a730-897def3e5b09; Geo={%22region%22:%22QC%22%2C%22country%22:%22CA%22%2C%22continent%22:%22NA%22}; ResponsiveSwitch.DesktopMode=1; Preferences=undefined; RequestVerificationToken=4b20d271-bcb4-41d1-84f7-2934f10f8d61; optimizelyEndUserId=oeu1773164549434r0.5310794790862315; ddb_sid=d5833fd3-d90b-436d-bf59-33d7a3731ce1; LoginState=bec7bc05-dfc4-4bf3-8d59-5abb191e6079; g_state={"i_l":0,"i_ll":1773164557960,"i_e":{"enable_itp_optimization":0}}; ddb.kid-session=eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..0jqCOpM1YcTolGtvCwWAig.CYiRg1MOQDkWPJm33sPVekRRyH0KCI_wlncTOj1y6yD531l_5J4pQ0bO_2B4ecD1I_XwGbRfZUz39Iqg0LCr6ylFU1BlSzVbXULsrUQSXOqqNMgooXtmdm-MqFVhpH6-.PPcCSGacm4IJp6PtgYMIBg; CobaltSession=eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..ni2LbmBFL7uIRGHZy1xjbQ.m2Jjdxyo91BjtPsu1eu0JQS9NltlqzcSv0_1VyrIscsXO-Fh6izZ0HxFqCZrZdLZ.9NDleYMGX5OaNU_QPMQnkQ; User.ID=115266091; User.Username=bilunsun; Preferences.Language=1; UserInfo={"UserId":115266091,"UserJoinDate":"2022-11-13","UserSessionId":"446e9732-7d0c-4fce-b51c-163e0d25b5d1"}; Preferences.TimeZoneID=1; WarningNotification.Lock=1; AWSALB=DlfWulxJB11qF7inuUHueLX+LwuZzaEMP3kd5bJqqM+TzHkgVbAOwTTXDKZ87O6tK/TFnng52iBlbqhdtn77uUX/kqbUhUUDYQJDZ7zkf1AYcb6lbAndZmAwYvQZ; AWSALBCORS=DlfWulxJB11qF7inuUHueLX+LwuZzaEMP3kd5bJqqM+TzHkgVbAOwTTXDKZ87O6tK/TFnng52iBlbqhdtn77uUX/kqbUhUUDYQJDZ7zkf1AYcb6lbAndZmAwYvQZ"""
        },
    },
    poll_interval=5,
)
print(f"Crawl complete: {result.status}, {len(result.data)} pages found")

for page in result.data:
    title = page.metadata.title if page.metadata and page.metadata.title else "untitled"
    md = page.markdown or ""
    filename = title.replace("/", "-").replace(" ", "_") + ".md"
    print(f"Saving: {filename}")
    with open(filename, "w") as f:
        f.write(md)
