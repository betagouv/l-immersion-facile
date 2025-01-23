import axios from "axios";
import { subMonths } from "date-fns";
import {
  expectObjectsToMatch,
  expectPromiseToFailWithError,
  expectToEqual,
} from "shared";
import { createAxiosSharedClient } from "shared-routes/axios";
import {
  AccessTokenResponse,
  AppConfig,
} from "../../../../config/bootstrap/appConfig";
import { InMemoryCachingGateway } from "../../caching-gateway/adapters/InMemoryCachingGateway";
import { noRetries } from "../../retry-strategy/ports/RetryStrategy";
import { RealTimeGateway } from "../../time-gateway/adapters/RealTimeGateway";
import { InseeSiretGateway } from "./InseeSiretGateway";
import { makeInseeExternalRoutes } from "./InseeSiretGateway.routes";

// These tests are not hermetic and not meant for automated testing. They will make requests to the
// real SIRENE API, use up production quota, and fail for uncontrollable reasons such as quota
// errors.
//
// Requires the following environment variables to be set for the tests to pass:
// - SIRENE_INSEE_ENDPOINT
// - SIRENE_INSEE_CLIENT_ID
// - SIRENE_INSEE_CLIENT_SECRET
// - SIRENE_INSEE_USERNAME
// - SIRENE_INSEE_PASSWORD
describe("InseeSiretGateway", () => {
  let siretGateway: InseeSiretGateway;

  beforeEach(() => {
    const config = AppConfig.createFromEnv();
    const inseeExternalRoutes = makeInseeExternalRoutes(
      config.inseeHttpConfig.endpoint,
    );
    siretGateway = new InseeSiretGateway(
      config.inseeHttpConfig,
      createAxiosSharedClient(
        inseeExternalRoutes,
        axios.create({ validateStatus: () => true }),
        {
          onResponseSideEffect: ({ response, input }) =>
            console.info(
              JSON.stringify(
                {
                  input: input,
                  responseStatus: response.status,
                  responseBody: response.body,
                },
                null,
                2,
              ),
            ),
        },
      ),
      new RealTimeGateway(),
      noRetries,
      new InMemoryCachingGateway<AccessTokenResponse>(
        new RealTimeGateway(),
        "expires_in",
      ),
    );
  });

  it("returns open establishments", async () => {
    // ETABLISSEMENT PUBLIC DU MUSEE DU LOUVRE (should be active)
    const response =
      await siretGateway.getEstablishmentBySiret("18004623700012");
    expectObjectsToMatch(response, { siret: "18004623700012" });
  });

  it("errors when format is wrong", async () => {
    await expectPromiseToFailWithError(
      siretGateway.getEstablishmentBySiret({ wrong: "format" } as any),
      new Error(
        "Le service INSEE siret n'est pas disponible: 400 - Erreur de syntaxe dans le paramètre q=siret:[object Object] AND periode(etatAdministratifEtablissement:A)",
      ),
    );
  });

  it("filters out closed establishments", async () => {
    // SOCIETE TEXTILE D'HENIN LIETARD, closed in 1966.
    const response =
      await siretGateway.getEstablishmentBySiret("38961161700017");
    expect(response).toBeUndefined();
  });

  it("returns establishments updated since a date", async () => {
    const now = new Date();
    const fromDate = subMonths(now, 10);
    const toDate = now;

    const testSiret = "32085382300013";

    const sirets = [
      testSiret,
      // there are about 1000 sirets below
      // 32140686000031,32218778200014,33132459000057,32530661100014,31412841400047,35283525000122,37834997100085,37958170500074,38038036000020,38253830400058,38918286600050,39409025200021,39431991700024,39534993900037,39096620800014,39196792400112,39238035800045,38230504300020,40883463800061,38395588700013,41007498300066,41130820800015,38923187900013,41244531400013,41248364600011,41340109200015,41473479800237,41478804200029,41491160200046,41537495800015,42170761300020,41818669800019,41899848000010,41928792500020,42283403600028,41991064100028,42011737600012,42976740300018,43145596300022,43284081700030,43779287200016,43819781600020,43924636400012,43936988500017,43989019500019,44039047400037,44073231100020,44088196900024,44118930500028,44147691800020,44375742200011,44395829300013,44400065700015,44805921200036,44848838700011,44853657300026,45065913100020,45067077300032,45093254600010,45093775000039,48455172600025,48535828700012,47911225200248,45256701900032,48781867600016,48781867600024,48785784900060,48789591400017,48837388700014,48909118100045,45356275300039,48080517500019,47806460300044,47812296300018,50869495700038,52071319900021,52087016300026,52119162700038,52200579200034,52277677200025,52294600300012,51324139800033,52334109700021,52351070900018,52392021300015,52481773100010,52483606100027,52797596500031,52802619800036,52826656200024,52834065600016,52838069400018,49998757600018,50003113300035,53005546600029,77522525300019,79018091300028,79801659800012,79815172600014,79429889300015,79098838000024,79135431900018,79138895200024,81210826400019,80414171100031,80415187600021,80451463600021,80492950300014,80492950300022,80493230900011,80500070000015,81336706700010,80779870700038,80816655700021,81867830200014,81903433100028,80965005400012,80965005400020,80988086700035,81023839400011,81032849200030,81068414200013,81091970400025,81105225700011,81118712900010,81168859700012,81172760100023,82047217300013,82086758800015,82118995800019,82168130100015,82185412200024,82204305500018,82222972000013,82299449700029,82315334100040,82332829900016,82341041000026,82386415200041,82392858500038,83038102600020,83050633300012,83947246100012,83949821900014,83975120300028,83976846200013,84003414400021,84009784400012,82471029700022,82472930500022,82487822700019,82506040300011,83447416500059,83502381300024,83533366700011,83775928100020,84110098500024,84133462600022,84135445900023,84154762300014,84191593700020,84221385200010,84287289700033,84374259400016,84376473900036,84463417000014,84474843400017,84754594400013,84775930500018,84784132700020,84822953000011,84836655500037,84863179200019,84901001200045,84904608100022,84935101000012,85017533200020,85042130600026,85053663200019,85053738200010,85120046900019,85185163400010,88010236300012,85205608400027,85231407900017,85237283800023,85237504700028,85259216100016,85259690700018,85267867100029,89078502500010,89079522200011,88213764900019,88289602000014,88296304400012,88311087600017,89100385700028,89165133300017,89187845600013,88468649400011,88486778900015,88487592300010,88507685100025,89412282900019,88751539300015,88757962100012,89460732400015,89466705400015,89479671300010,88831239400016,88831239400024,88876222600023,88900796900013,88915124700018,89770531500017,89807660900012,89821482000018,89877084700025,89911581000017,89963926400014,89972441300013,89995690800011,90016522600011,90534122800013,90772364700018,90799324000015,90824099700019,90841514400025,90074559700014,90075373200016,90079545100021,90080068100018,91212242100015,91235387700018,91242321700021,91260671200012,91264790600011,90996600400014,91275608700017,91009320200018,91014630700012,90198455900012,91309213600013,91315949700019,91326862900023,91345016900010,91354135500016,91359839700010,91383220000012,90296048300029,90297646300015,91459351200017,91520284000012,91535099500014,91536388100011,91755163200016,91758943400021,91765268700018,91766695000014,91785032300010,91786505700017,91801453100027,91802016500018,91807855100010,91829835700016,91835960500014,91846600400010,91851839000011,91852134500010,91853056900014,91854498200013,91862647400020,91875502600013,91899613300016,91900838300011,91912865200014,91916092900015,91937966900014,91950392000010,91961615100016,91962340500017,91965523300014,91972327000014,91975922500015,91979805800013,91981639700013,91991509000014,92002576400019,92009993400019,92012000300016,92012392400028,92021482200016,92040222900016,92051599600014,92056816900014,92062058000018,92070627200019,92072022400012,92101442900010,92102039200012,92109184900015,92117184900018,92123339100017,92124678100014,92125031200011,92165413300021,92168935200018,92188865700019,92193858500012,92203850000018,92204051400015,92211589400011,92226267000016,94838559600010,92246772500011,92248524800020,94855906700012,92277507700014,92318350300013,94867835400010,94869060700015,94874304200012,94874688800015,94878784100014,94879372400014,94881978400018,94885803000018,92354047000013,92354100700012,92354109800011,94953589200010,94954437300010,94963579100013,92354147800015,92354148600018,92354154400014,92354168400018,92354173400011,92354181700014,95063980700011,95079471900019,95083209700014,95088054200010,95097385900024,92354300300019,92354310200019,92354321900011,92354332600014,92354348200015,92354352400014,92354371400011,95130803000018,95131575300016,95133007500015,95140580200012,95141878900016,95235582400014,95166131300019,95168560100019,95168998300017,95169943800010,95263774200018,95263854200011,95176622900011,95241794700019,95242709400018,95242939700013,95187101100015,95187471800012,95191191600017,95248503500010,95267408300011,95267754000017,95267987600013,95268333200011,95194465100011,95196683700019,95197777600016,95199435900010,95268760600014,95254579600015,95255281800017,95255324600010,95255632200016,95255730400013,95269435400012,95256835000013,95269805800015,95269921300015,95270001100010,95270027600019,95270312200012,95270318900011,95270321300019,95270532500019,95270564800014,95270598600018,95277030300016,95277048500011,95279238000018,95277171500010,95277256400011,95277302600010,95279550800011,95279595300019,95279626600015,95277411500010,95279745400016,95279828800017,95279836100012,95277573200011,95277604500017,95277638300012,95277659900013,95276194800019,95276210200012,95276241700014,95276305000012,95276380300014,95276411600010,95276430600017,95276528700018,95276621000019,95276669900013,95276737400012,95278132600014,95278175500014,95278264700012,95278279500019,95278302500010,95278546700012,95278581400015,95278602800011,95278643200015,95278646500015,95278743000018,95278766100018,95278818000018,95278874300013,95278930300015,21120220500046,21120230400047,13003107300013,20006814600030,26660026100116,30321425800020,30964636200017,31121119700026,32973236600029,33022591300020,33048317300010,32687584600015,33473180900060,33495971500056,32753275000020,35322272200103,39355498500027,39825424300023,39848252100083,40089930800086,40323081600031,40375864200017,40440057400095,40468183500017,40470567500167,41124997200026,41210073700011,41622001001108,41826646600063,41931084200010,41978852600012,42978560300029,43407903400055,43446575300029,44509549000063,44509849400021,48414104900029,48414123900026,48324585800038,49222961200022,49271613900042,49293589500010,49294997900016,49303816000021,49315900800017,49337231200022,49447884500030,49517350200032,49520604700021,49760728300171,51937887100049,51967646400034,50981899300032,51106538500029,51143282500020,49850530400028,51285592500024,51368696400059,51504897300058,49889328800023,49904438600021,51860893000021,50040505500038,50530316400022,50742408300032,50773845800011,52889473600024,52924120000045,52932270300024,52969469700028,53171838500010,53200339900047,53200339900054,53211411300030,53285296900023,53330387100024,53336536700010,53372006600034,53396470600022,53492615900011,53517111000021,53845454700018,75036552000014,75180682900014,75214739700018,75378251500047,75392509800018,77795985900011,79270369600023,79277778100016,78198646800010,78573849300010,80316346800025,80330328800028,79830807800012,81341581700028,81356471300010,81382180800017,81386250500035,81391619400034,81404488900016,81457932200029,81473544500029,81518404900022,81521865600024,81540039500027,81785152000012,80888903400027,80912723600028,81987960200038,82923766800027,82930932700015,82934513100025,82947664700021,82950438000017,83088073800034,83141500500030,83187982000015,83196186700015,83197709500015,83225397500037,83258000500011,83260160300026,83319819500012,83319819500020,83330436300025,83333302400028,83344358300012,83391038300037,82426061600027,82453392100022,83427032400017,83427226200017,83440872600018,82519566200010,82771096300022,82771096300030,82779832300024,82836578300012,82851109700028,82865081200021,82873980500012,83898050600045,85120116000021,87962620800034,85157832800011,88973713600016,88996095100016,88997423400011,89041074900018,85310629200032,85359944700010,85384135100010,85397649600036,86850053900036,87762841200018,87841487900014,87879716600021,87902230900014,90371271900017,89973517900017,91167669000025,90020396900010,90026242900039,90067349200022,90068797100011,90864178000014,90864198800021,90894800300011,90934859100019,90960898600016,91202148200019,90147380100016,90166355900010,90171997100011,91271898800013,90998046800013,91281911700017,90197320600021,91055112600022,91073575200016,91113608300019,91114442600010,91487568700016,91490928800013,91519427800015,92351576100024,94815521300028,94825587200020,92242236500010,94841886800014,94842269600013,92270545400010,94858059200012,94866007100010,92321940600017,92326027700010,92353938100015,92353939900017,92353942300015,92353986000018,92353991000011,92354007400013,92354025600016,92354037100013,92354043900018,94897162700013,92354052000015,92354144500014,94973149100013,94975597900018,94983453500021,94989650000012,94991382600010,94997569200011,92354185800018,92354190800011,92354196500011,92354253400014,92354256700014,92354268200011,92354279900013,92354287200018,92354294800016,95097560700066,95098983000019,95108360900010,95112207600015,95115874000013,95116821000015,95121790000012,95122182900017,95129002200015,95130462500019,92354384700019,92354398700013,92354404300014,92354406800011,92354426600011,92354442300018,92354445600018,92354446400012,92354450600010,92354457100014,92354467000014,92354480300011,92354527100010,92354532100013,92354550300016,92354553700014,92354562800011,92354567700018,94746554800016,94748489500026,94751524300014,94759448700011,94764238500019,94768107800012,94771097600012,94776950100018,94784775200013,94787147100019,94792292800017,94792852900017,94795414500019,94797287300014,94800071600027,95143407500010,95145329900012,95147604300017,95147853600018,95148115900014,95150603900019,95160114500018,95162433700014,95163617400017,95235624400014,95236920500010,95237922000017,95172940900015,95175972900019,95264254400011,95241036300016,95241592500017,95265302000018,95266123900014,95250045200018,95250340700019,95199719600013,95202245700016,95203671300016,95207197500017,95207700600015,95207800400019,95209036300013,95209163500013,95210621900019,95214395600011,95217024900017,95222637100013,95257640300010,95257688200015,95224148700018,95226205300012,95270763600017,95270793300018,95231640400021,95271020000017,95271120800019,95271128100016,95271166100019,95271206500012,95271302200012,95271377400018,95271678500011,95271854200014,95272000100017,95260972500017,95261222400016,95272230400013,95272274200014,95272378100011,95272391400018,95272442500014,95262580400010,95262706500016,95262781800018,95262873300018,95262879000018,95263103400016,95273245100010,95273261800014,95274098300012,95274302900011,95274363100022,95274387000018,95277101200012,95274581800015,95274805100010,95274908300012,95275354900015,95275356400014,95279680300015,95277441200011,95277444600019,95277503900011,95277521100016,95277556700011,95277832200018,95278090600014,95278101100012,95278166400018,95278236500011,95278291000014,95278397500016,95278496500016,95278820600011,95278850300011,21540586100034,21120236100054,21120239500086,30543682600039,31794069000017,31943434600023,31951867600063,32010184300037,33136639300030,33405885600033,33455021700015,32714596700037,33755195600028,33914781100022,33972448600024,31432906100068,34260912000114,35082854700017,35105941500015,35343911000035,34776992900089,34806990700015,34839876900037,34885034800015,35023715200037,35043095500020,39295763500049,39304865700034,42178213700028,42189608500055,42242299800019,42244058600010,42272196900018,42877571200014,42915654000040,43383782000011,43391190600017,49029786800047,45406955000068,47993920900025,49827355600023,51783383600037,51825000600013,49978465000016,49978465000024,49983956100010,50202105800024,50383689200011,53913318100021,53970123500019,57219645900067,75043660200015,75119831800014,75286432200041,75330613300020,78945269500024,79490729500024,79492130400026,79505389100029,79212049500025,79789473000028,79790748200021,79515104200012,79518722800023,80174379000025,80201630300017,80210864700040,80222776900022,80233276700036,80248174700037,80288907100022,80289234900019,80314213200015,81194646600026,80342127000015,80349857500056,80350552800015,81249132200051,81264760000020,79868789300023,81278783600087,81286340500013,79885089700025,80084790700014,80471735300036,83920577000010,83399176300529,84061924100028,88962641200015,88966910700027,85176501600015,85185472900023,85186555000020,88013984500015,88015086700013,88035201800019,88035602700016,88050094700028,88058905600014,88064606200013,88107757200017,87886494100017,88204685700018,87913514300029,88210937400018,88228021700010,88253535400014,88267076300011,88283303100025,88287913300016,88446291200038,89253127800018,89272246300015,89311189800019,89363364400024,89370220900014,88515381700022,89437595500024,88755709800019,89452498200010,88777102000013,88813856700027,88821403800034,89481783200021,89507274200011,89511749700027,89743917000027,88890600500010,89769520100011,89892086300013,89922770600020,89938576900018,90340358200013,90365491100010,90434562600025,90451506100011,90510866800013,90514323600024,90515107200030,90518585600010,91172889700016,91182261700013,90178492600015,91283692100011,90198795800013,90204230800020,90238934500023,90248502800010,90264283400011,90290897900013,90292528800026,91455374800023,92351629800026,92353836700015,92353850800014,92353854000017,92353872200011,92353877100018,92353878900010,92353902700014,92353911800011,92326257000016,92331379500018,92336137200017,92342358600018,95171354400017,95238050900010,95239024300014,95240037200019,95179190400018,95181998600013,95184695500015,95185171600013,95242987600016,95244649000015,95245666300014,95245887500012,95247007800017,95247047400018,95248602500010,95268506300010,95268719200015,95199562000014,95268872900013,95269052700017,95269194700016,95269623500011,95269686200012,95269732400012,95257103200012,95257468900016,95223563800014,95223727900015,95257711200016,95258352400014,95229474200012
    ];

    const response = await siretGateway.getEstablishmentUpdatedBetween(
      fromDate,
      toDate,
      sirets.map((siret) => siret.toString()),
    );

    expectToEqual(response, {
      [testSiret]: {
        siret: testSiret,
        businessName: "RHUM DE SAINT MAURICE",
        businessAddress: "LD ST MAURICE 97320 SAINT-LAURENT-DU-MARONI",
        isOpen: true,
        nafDto: {
          code: "1101Z",
          nomenclature: "NAFRev2",
        },
        numberEmployeesRange: "10-19",
      },
    });
  });

  it("returns empty array, when no establishment needs update", async () => {
    const response = await siretGateway.getEstablishmentUpdatedBetween(
      new Date("2023-05-22"),
      new Date("2023-06-20"),
      ["11110000111122"],
    );

    expectToEqual(response, {});
  });
});
