import urllib.request
import re

url = 'https://www.geeksforgeeks.org/software-engineering/software-engineering-selenium-an-automation-tool/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    img_urls = re.findall(r'<img[^>]+src=\"([^\"]+)\"[^>]*>', html)
    for u in img_urls:
        if 'selenium' in u.lower() or 'grid' in u.lower() or 'rc' in u.lower() or 'ide' in u.lower():
            print(u)
except Exception as e:
    print(e)
