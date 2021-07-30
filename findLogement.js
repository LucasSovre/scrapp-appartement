const puppeteer = require("puppeteer");
const cliProgress = require('cli-progress');
const prompt = require('prompt-sync')();

let locationArray = [];

const minimal_args = [
  '--autoplay-policy=user-gesture-required',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--disable-domain-reliability',
  '--disable-extensions',
  '--disable-features=AudioServiceOutOfProcess',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-notifications',
  '--disable-offer-store-unmasked-wallet-cards',
  '--disable-popup-blocking',
  '--disable-print-preview',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-setuid-sandbox',
  '--disable-speech-api',
  '--disable-sync',
  '--hide-scrollbars',
  '--ignore-gpu-blacklist',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-pings',
  '--no-sandbox',
  '--no-zygote',
  '--password-store=basic',
  '--use-gl=swiftshader',
  '--use-mock-keychain',
];

const getData = async () => {

    const browser = await puppeteer.launch({
        ignoreHTTPSErrors: true,
        args : minimal_args,
        headless: true,
      });
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet' || request.resourceType() === 'font') {request.abort()}
        else request.continue();
      });
    
      console.log("script launched")
      const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

      await page.goto(
        "https://portal.mytum.de/studium/wohnraumallianz/mietobjekte/dynocontainer_view_mod?b_start:int=0&-C="
      );
      page.waitForSelector('#maincontentwrapper > div:nth-child(1) > div:nth-child(4) > span > div:nth-child(3) > div > div:nth-child(1) > span:nth-child(5) > a',{ timeout: 500 })
      let searchLength = await page.$eval('#maincontentwrapper > div:nth-child(1) > div:nth-child(4) > span > div:nth-child(3) > div > div:nth-child(1) > span:nth-child(5) > a', (elm) => elm.textContent);
      searchLength2 = (parseInt(searchLength)-1)*15;

      let linkArray =  [];
      bar1.start(searchLength, 0);
      for (let index =0 ; index <= searchLength2; index=index+15){
        try{
        await page.goto(
          "https://portal.mytum.de/studium/wohnraumallianz/mietobjekte/dynocontainer_view_mod?b_start:int=" + index +"&-C="
        );
        }catch(e){console.log('\n an error occurred, please check your internet connexion'); process.exit();}
        for(let i = 1; i < 16; i++){
          try {
          page.waitForSelector('#maincontentwrapper > div:nth-child(1) > div:nth-child(4) > span > div:nth-child(3) > div > table > tbody > tr:nth-child(' + i + ') > td:nth-child(2) > a',{ timeout: 500 })
          const context = await page.$eval('#maincontentwrapper > div:nth-child(1) > div:nth-child(4) > span > div:nth-child(3) > div > table > tbody > tr:nth-child(' + i + ') > td:nth-child(2) > a', (elm) => elm.textContent);
          const found = context.match(/\w/g);
          if(found !== null) {
            const href = await page.$eval('#maincontentwrapper > div:nth-child(1) > div:nth-child(4) > span > div:nth-child(3) > div > table > tbody > tr:nth-child(' + i + ') > td:nth-child(2) > a', (elm) => elm.href);
          linkArray.push(href);
          }
          } catch(e) {console.log('non valid element')}
        }
        bar1.update(index/15+1);
      }
      bar1.stop();

    console.log('\n', "okay, i got the link, let see what's new there ..." , '\n');

    const bar2 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar2.start(linkArray.length, 0);
    for(item in linkArray){
      await page.goto(linkArray[item]);
      page.waitForSelector('#dynocontainer-content > div > div:nth-child(3) > div > div > div:nth-child(1)')
      const publish  = await page.$eval('#dynocontainer-content > div > div:nth-child(3) > div > div > div:nth-child(1)', (elm) => elm.textContent);
      const publishDate = publish.substring(publish.indexOf('Veröffentlicht')+16,publish.indexOf(')',publish.indexOf('Veröffentlicht')))
      const publishDateFormatted = publishDate.substring(6,10)+'-'+ publishDate.substring(3,5)+'-'+ publishDate.substring(0,2)
      const disponibility  = await page.$eval('#dynocontainer-content > div > div:nth-child(3) > div > div > div:nth-child(5) > div:nth-child(2) > div:nth-child(1)', (elm) => elm.textContent);
      const size  = await page.$eval('#dynocontainer-content > div > div:nth-child(3) > div > div > div:nth-child(5) > div:nth-child(2) > div:nth-child(3)', (elm) => elm.textContent);
      const price  = await page.$eval('#dynocontainer-content > div > div:nth-child(3) > div > div > div:nth-child(5) > div:nth-child(4) > div:nth-child(1)', (elm) => elm.textContent);
      const road  = await page.$eval('#dynocontainer-content > div > div:nth-child(3) > div > div > div:nth-child(6) > div:nth-child(2) > div', (elm) => elm.textContent);
      const city  = await page.$eval('#dynocontainer-content > div > div:nth-child(3) > div > div > div:nth-child(6) > div:nth-child(3)', (elm) => elm.textContent);
      let object = {'publication' : publishDateFormatted, 'disponibilitée' : disponibility, 'taille':size, 'price':price, "adresse" : road + city.replace(/\n/g,'').replace(/\t/g,''), 'link' :linkArray[item]}
      locationArray.push(object);
      bar2.update(parseInt(item)+1);
    }
    const sortedlocationArray = locationArray.slice().sort((a, b) => new Date (a.publication) - new Date (b.publication))
    console.log('\n')
    console.table(sortedlocationArray, ['publication','disponibilitée','taille','price','adresse']);
    let answer =''

    while(answer !== 'x'){
      console.log("\n Entrez : \n \t -x pour sortir du programme \n\t -a pour voir le tableau complet \n\t -b pour voir les 10 plus récents \n \t -un indexe pour obtenir plus d'information à propos du bien.")
      answer = prompt('=>');
      if(answer === 'a'){
        console.log('\n')
        console.table(sortedlocationArray, ['publication','disponibilitée','taille','price','adresse']);
      }
      if(answer === 'b'){
        console.log('\n')
        console.table(sortedlocationArray.slice(sortedlocationArray.length-10,sortedlocationArray.length), ['publication','disponibilitée','taille','price','adresse']);
      }
      if(answer !== 'x' && answer !== 'a' && answer !== 'b'){
        try{
        console.table(sortedlocationArray[parseInt(answer)])}
        catch(e){console.log('entrez une réponse correcte (un nombre ou "x")')}
      }
    }

    await page.close();
    await browser.close();
    process.exit();
  }


getData();
