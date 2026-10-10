<!-- [KANO_PLUGIN_START] 【电源联动指示灯】设备端常驻版.js -->
<script>
/* ============================================================
 * 电源联动指示灯 · 设备端常驻版（UFI-TOOLS 插件）
 * 把联动逻辑部署到设备上运行，关网页/关浏览器都生效，可开机自启。
 * 依赖：高级功能（root shell）
 * ============================================================ */
(async () => {
  const DIR = '/data/power_led';
  const SCRIPT = DIR + '/power_led.sh';
  const AUTO = '/data/adb/service.d/power_led.sh';
  const VER = 'v2-curl-3';
  const B64 = 'IyEvc3lzdGVtL2Jpbi9zaAojIFZFUjogdjItY3VybC0zICAg4oaQIOaPkuS7tumdoOi/meS4gOihjOWIpOaWreiEmuacrOeJiOacrO+8jOWLv+WIoAojID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQojIOeUtea6kOiBlOWKqOaMh+ekuueBryDCtyDorr7lpIfnq6/luLjpqbvniYjvvIh2Mu+8jOWFjSB6cmVx77yM57qvIGN1cmwg5a6e546w77yJCiMgICDmjqXlhaXnlLXmupDvvIjlhYXnlLUv55u05L6b55S177yJ4oaSIOWFs+aMh+ekuueBr++8m+aWreW8gOeUtea6kCDihpIg5byA5oyH56S654GvCiMgICDot5HlnKjorr7lpIfkuIrvvIzlhbPnvZHpobUv5YWz5rWP6KeI5Zmo6YO955Sf5pWI77yb5Y+v6KOF5byA5py66Ieq5ZCvCiMKIyDnlKjms5U6CiMgICBwb3dlcl9sZWQuc2ggc3RhcnR8c3RvcHxyZXN0YXJ0ICAgICDlkK/lgZzluLjpqbvogZTliqgKIyAgIHBvd2VyX2xlZC5zaCBzdGF0dXMgICAgICAgICAgICAgICAgIOeci+eKtuaAgQojICAgcG93ZXJfbGVkLnNoIG9uY2V8Zm9yY2UgICAgICAgICAgICAg56uL5Y2z5omn6KGM5LiA5qyhIC8g5by65Yi25omn6KGMCiMgICBwb3dlcl9sZWQuc2ggbGlnaHQgb258b2ZmICAgICAgICAgICDmiYvliqjlvIAv5YWz54Gv77yI5LiN55yL5L6b55S154q25oCB77yJCiMgICBwb3dlcl9sZWQuc2ggbG9nIFtuXSAgICAgICAgICAgICAgICDnnIvml6Xlv5cKIyAgIHBvd2VyX2xlZC5zaCBpbnN0YWxsfHVuaW5zdGFsbCAgICAgIOijhS/ljbjlvIDmnLroh6rlkK8oTWFnaXNrIHNlcnZpY2UuZCkKIyAgIHBvd2VyX2xlZC5zaCBwdXJnZSBbLS1rZWVwLWxpZ2h0XSAgIOW9u+W6leWNuOi9ve+8muWBnOi/m+eoiyvliKDoh6rlkK8r5Yig55uu5b2VCiMgICBwb3dlcl9sZWQuc2ggcnVuICAgICAgICAgICAgICAgICAgICDlrojmiqTkuLvlvqrnjq/vvIjlhoXpg6jnlKjvvIkKIwojIOeOr+Wig+WPmOmHjzogSU5URVJWQUw9NSAg6L2u6K+i6Ze06ZqU56eS77ybRElSIC8gQVVUTyDlj6/opobnm5bvvIjmtYvor5XnlKjvvIkKIyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KCkRJUj0ke0RJUjotL2RhdGEvcG93ZXJfbGVkfQpTRUxGPSIkRElSL3Bvd2VyX2xlZC5zaCIKQkFTRT1odHRwOi8vMTkyLjE2OC4wLjE6ODA4MApBUFA9L2RhdGEvZGF0YS9jb20ubWluaWthbm8uZjUwX3Ntcy9maWxlcwpDVVJMPSIkQVBQL2N1cmwiClNIQT0iJEFQUC9zaGEyNTYiCkpRPSIkQVBQL2pxIgpQV0RfRU5DPSdXYUA5dytZV1J0YVc0PScKSU5URVJWQUw9JHtJTlRFUlZBTDotNX0KRU5GT1JDRT0ke0VORk9SQ0U6LTF9ICAgICAgICAgICMgMT3oh6rmhIjvvIjnuqDmraPooqvlpJbpg6jmlLnliqjnmoTnga/mgIHvvIkwPeS7heeKtuaAgeWPmOWMluaXtuWGmQpMT0c9IiRESVIvcG93ZXJfbGVkLmxvZyIKU1RBVEU9IiRESVIvbGFzdF9zdGF0ZSIKUElERklMRT0iJERJUi9wb3dlcl9sZWQucGlkIgpBVVRPPSR7QVVUTzotL2RhdGEvYWRiL3NlcnZpY2UuZC9wb3dlcl9sZWQuc2h9CkxPR19NQVg9MjYyMTQ0CkZBSUxfTE9HR0VEPTAKCmxvZygpIHsgZWNobyAiJChkYXRlICcrJW0tJWQgJUg6JU06JVMnKSAkKiIgPj4iJExPRyI7IH0Kbm93KCkgeyBlY2hvICIkKGRhdGUgKyVzKTAwMCI7IH0KanNvbl9nZXQoKSB7ICIkSlEiIC1yICIuJDEgLy8gZW1wdHkiIDI+L2Rldi9udWxsOyB9CgojIOivu+Wtl+aute+8iEdFVCDkuI3pnIDopoHnmbvlvZXvvIkKZ2V0X2NtZCgpIHsgIiRDVVJMIiAtcyAtbSA4ICIkQkFTRS9nb2Zvcm0vZ29mb3JtX2dldF9jbWRfcHJvY2Vzcz9pc1Rlc3Q9ZmFsc2UmY21kPSQxJl89JChub3cpIiAyPi9kZXYvbnVsbDsgfQpyZWFkX2NoYXJnaW5nKCkgeyBnZXRfY21kIGJhdHRlcnlfY2hhcmdpbmcgfCBqc29uX2dldCBiYXR0ZXJ5X2NoYXJnaW5nOyB9CnJlYWRfbGlnaHQoKSAgICB7IGdldF9jbWQgaW5kaWNhdG9yX2xpZ2h0X3N3aXRjaCB8IGpzb25fZ2V0IGluZGljYXRvcl9saWdodF9zd2l0Y2g7IH0KCiMg5YaZ5oyH56S654Gv77ya55m75b2VKExE4oaSc2hhMjU26ZO+KSDihpIg5Y+WIEFEIOmYsumHjeaUviDihpIgUE9TVOOAgiQxOiAxPeW8gCAwPeWFswpzZXRfbGlnaHQoKSB7CiAgd2FudD0kMQogIExEPSQoZ2V0X2NtZCBMRCB8IGpzb25fZ2V0IExEKQogIFsgLXogIiRMRCIgXSAmJiByZXR1cm4gMQogIEg9JCgiJFNIQSIgIiQoIiRTSEEiICIkUFdEX0VOQyIpJExEIikgfHwgcmV0dXJuIDEKCiAgQ09PS0lFPSQoIiRDVVJMIiAtcyAtbSA4IC1EIC0gLW8gL2Rldi9udWxsIC1YIFBPU1QgIiRCQVNFL2dvZm9ybS9nb2Zvcm1fc2V0X2NtZF9wcm9jZXNzIiBcCiAgICAgIC1IICdDb250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcgXAogICAgICAtSCAicmVmZXJlcjogJEJBU0UvaW5kZXguaHRtbCIgLUggJ3VzZXItYWdlbnQ6IE1vemlsbGEvNS4wJyBcCiAgICAgIC0tZGF0YSAiZ29mb3JtSWQ9TE9HSU4maXNUZXN0PWZhbHNlJnBhc3N3b3JkPSRIIiBcCiAgICB8IHNlZCAtbiAncy9eW1NzXWV0LVtDY11vb2tpZTogKlwoW147XSpcKS4qL1wxL3AnIHwgaGVhZCAtMSkKICBbIC16ICIkQ09PS0lFIiBdICYmIHJldHVybiAxCgogIElORk89JChnZXRfY21kICdMYW5ndWFnZSxjcl92ZXJzaW9uLHdhX2lubmVyX3ZlcnNpb24nIHwgdHIgLWQgJyBcbicpCiAgV0E9JChwcmludGYgJyVzJyAiJElORk8iIHwgc2VkIC1uICdzLy4qIndhX2lubmVyX3ZlcnNpb24iOiJcKFteIl0qXCkiLiovXDEvcCcpCiAgQ1I9JChwcmludGYgJyVzJyAiJElORk8iIHwgc2VkIC1uICdzLy4qImNyX3ZlcnNpb24iOiJcKFteIl0qXCkiLiovXDEvcCcpCiAgUkQ9JCgiJENVUkwiIC1zIC1tIDggLUggIkNvb2tpZTogJENPT0tJRSIgIiRCQVNFL2dvZm9ybS9nb2Zvcm1fZ2V0X2NtZF9wcm9jZXNzP2lzVGVzdD1mYWxzZSZjbWQ9UkQmXz0kKG5vdykiIHwganNvbl9nZXQgUkQpCiAgWyAteiAiJFJEIiBdICYmIHJldHVybiAxCiAgQUQ9JCgiJFNIQSIgIiQoIiRTSEEiICIke1dBfSR7Q1J9Iikke1JEfSIpIHx8IHJldHVybiAxCgogIE9VVD0kKCIkQ1VSTCIgLXMgLW0gOCAtWCBQT1NUICIkQkFTRS9nb2Zvcm0vZ29mb3JtX3NldF9jbWRfcHJvY2VzcyIgXAogICAgICAtSCAnQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9VVRGLTgnIFwKICAgICAgLUggInJlZmVyZXI6ICRCQVNFL2luZGV4Lmh0bWwiIC1IICJDb29raWU6ICRDT09LSUUiIC1IICd1c2VyLWFnZW50OiBNb3ppbGxhLzUuMCcgXAogICAgICAtLWRhdGEgImdvZm9ybUlkPUlORElDQVRPUl9MSUdIVF9TRVRUSU5HJmluZGljYXRvcl9saWdodF9zd2l0Y2g9JHdhbnQmaXNUZXN0PWZhbHNlJkFEPSRBRCIgMj4vZGV2L251bGwpCiAgY2FzZSAiJE9VVCIgaW4gKnN1Y2Nlc3MqKSByZXR1cm4gMCA7OyAqKSByZXR1cm4gMSA7OyBlc2FjCn0KCnJvdGF0ZV9sb2coKSB7CiAgWyAtZiAiJExPRyIgXSB8fCByZXR1cm4gMAogIFsgIiQod2MgLWMgPCIkTE9HIiAyPi9kZXYvbnVsbCB8fCBlY2hvIDApIiAtZ3QgIiRMT0dfTUFYIiBdICYmIHRhaWwgLWMgNjU1MzYgIiRMT0ciID4iJExPRy50bXAiICYmIG12ICIkTE9HLnRtcCIgIiRMT0ciCn0KCiMg5oyJ5b2T5YmN5L6b55S154q25oCB5omn6KGM5LiA5qyh77ybJDE9Zm9yY2Ug5pe25peg6KeG5Y676YeNCiMgRU5GT1JDRT0x77yI6buY6K6k77yJ77ya5q+U5a+55a6e6ZmF54Gv5oCB77yM6KKr5aSW6YOo5pS55Yqo5Lmf5Lya57qg5q2j77yI6Ieq5oSI77yJCiMgRU5GT1JDRT0wICAgICAgICDvvJrlj6rlnKjkvpvnlLXnirbmgIHlj5jljJbml7blhpnnga/vvIjljp/mj5Lku7booYzkuLrvvIkKYXBwbHlfb25jZSgpIHsKICBjaD0kKHJlYWRfY2hhcmdpbmcpCiAgaWYgWyAteiAiJGNoIiBdOyB0aGVuCiAgICBbICIkRkFJTF9MT0dHRUQiID0gIjAiIF0gJiYgeyBsb2cgIuKaoCDor7vkuI3liLDkvpvnlLXnirbmgIHvvIjlkI7lj7DmnKrlsLHnu6rvvJ/vvInlkI7nu63pnZnpu5jph43or5UiOyBGQUlMX0xPR0dFRD0xOyB9CiAgICByZXR1cm4gMgogIGZpCiAgRkFJTF9MT0dHRUQ9MAogIGxhc3Q9JChjYXQgIiRTVEFURSIgMj4vZGV2L251bGwpCiAgd2FudD0kKFsgIiRjaCIgPSAiMSIgXSAmJiBlY2hvIDAgfHwgZWNobyAxKQoKICBpZiBbICIkMSIgIT0gImZvcmNlIiBdOyB0aGVuCiAgICBpZiBbICIkRU5GT1JDRSIgPSAiMSIgXTsgdGhlbgogICAgICBsdj0kKHJlYWRfbGlnaHQpCiAgICAgIFsgLXogIiRsdiIgXSAmJiByZXR1cm4gMgogICAgICBpZiBbICIkbHYiID0gIiR3YW50IiBdOyB0aGVuIGVjaG8gIiRjaCIgPiIkU1RBVEUiOyByZXR1cm4gMDsgZmkgICAjIOW3suespuWQiO+8jOmdmem7mAogICAgZWxzZQogICAgICBbICIkbGFzdCIgPSAiJGNoIiBdICYmIHJldHVybiAwCiAgICBmaQogIGZpCgogIGlmIHNldF9saWdodCAiJHdhbnQiOyB0aGVuCiAgICBlY2hvICIkY2giID4iJFNUQVRFIgogICAgWyAiJGNoIiA9ICIxIiBdICYmIGxvZyAi8J+UjCDmjqXlhaXnlLXmupAg4oaSIOWFs+eBryIgfHwgbG9nICLwn5SLIOaWreW8gOeUtea6kCDihpIg5byA54GvIgogICAgcmV0dXJuIDAKICBmaQogIGxvZyAi4p2MIOWGmeaMh+ekuueBr+Wksei0pe+8iOS+m+eUtT0kY2gg55uu5qCH54GvPSR3YW5077yJIgogIHJldHVybiAxCn0KCmlzX3J1bm5pbmcoKSB7IFsgLWYgIiRQSURGSUxFIiBdICYmIFsgLWQgIi9wcm9jLyQoY2F0ICIkUElERklMRSIgMj4vZGV2L251bGwpIiBdOyB9CmRvX3N0b3AoKSB7CiAgaWYgaXNfcnVubmluZzsgdGhlbiBwPSQoY2F0ICIkUElERklMRSIpOyBraWxsICIkcCIgMj4vZGV2L251bGw7IHNsZWVwIDEKICAgIFsgLWQgIi9wcm9jLyRwIiBdICYmIGtpbGwgLTkgIiRwIiAyPi9kZXYvbnVsbAogICAgcm0gLWYgIiRQSURGSUxFIjsgZWNobyAi4o+5IOW3suWBnOatou+8iFBJRCAkcO+8iSIKICBlbHNlIGVjaG8gIuacquWcqOi/kOihjCI7IGZpCn0KCmNhc2UgIiQxIiBpbgogIHJ1bikKICAgIGVjaG8gJCQgPiIkUElERklMRSIKICAgIHRyYXAgJ2xvZyAi4o+5IOmAgOWHuu+8jOWBnOatouiBlOWKqCI7IHJtIC1mICIkUElERklMRSI7IGV4aXQgMCcgVEVSTSBJTlQgSFVQCiAgICBsb2cgIuKWtiDlkK/liqjogZTliqjvvIjpl7TpmpQgJHtJTlRFUlZBTH1z77yM6Ieq5oSIPSR7RU5GT1JDRX3vvIxQSUQgJCTvvIkiCiAgICBhcHBseV9vbmNlIGZvcmNlID4vZGV2L251bGwgMj4mMQogICAgd2hpbGUgOjsgZG8gYXBwbHlfb25jZTsgcm90YXRlX2xvZzsgc2xlZXAgIiRJTlRFUlZBTCI7IGRvbmUgOzsKCiAgc3RhcnQpCiAgICBpZiBpc19ydW5uaW5nOyB0aGVuIGVjaG8gIuW3suWcqOi/kOihjO+8iFBJRCAkKGNhdCAiJFBJREZJTEUiKe+8iSI7IGV4aXQgMDsgZmkKICAgIElOVEVSVkFMPSIkSU5URVJWQUwiIEVORk9SQ0U9IiRFTkZPUkNFIiBESVI9IiRESVIiIEFVVE89IiRBVVRPIiBub2h1cCBzZXRzaWQgL3N5c3RlbS9iaW4vc2ggIiRTRUxGIiBydW4gPi9kZXYvbnVsbCAyPiYxICYKICAgIHNsZWVwIDMKICAgIGlzX3J1bm5pbmcgJiYgZWNobyAi4pyFIOW3suWQr+WKqO+8iFBJRCAkKGNhdCAiJFBJREZJTEUiKe+8jOmXtOmalCAke0lOVEVSVkFMfXPvvIkiIHx8IHsgZWNobyAi4p2MIOWQr+WKqOWksei0pe+8jOeci++8miQwIGxvZyI7IGV4aXQgMTsgfSA7OwoKICBzdG9wKSBkb19zdG9wIDs7CgogIHJlc3RhcnQpIGRvX3N0b3A7ICIkU0VMRiIgc3RhcnQgOzsKCiAgb25jZXxmb3JjZSkKICAgIGFwcGx5X29uY2UgIiQoWyAiJDEiID0gZm9yY2UgXSAmJiBlY2hvIGZvcmNlKSIKICAgIHJjPSQ/OyBbICIkcmMiID0gMCBdICYmIGVjaG8gIuKchSDlt7LmiafooYzvvIjkvpvnlLU9JChjYXQgIiRTVEFURSIgMj4vZGV2L251bGwp77yJIiB8fCBlY2hvICLimqAg5pyq5omn6KGM77yI6YCA5Ye656CBICRyY++8iSIgOzsKCiAgbGlnaHQpCiAgICBjYXNlICIkMiIgaW4KICAgICAgb258MSkgIHNldF9saWdodCAxICYmIGVjaG8gIuKchSDmjIfnpLrnga/lt7LlvIAiIHx8IGVjaG8gIuKdjCDlvIDnga/lpLHotKUiIDs7CiAgICAgIG9mZnwwKSBzZXRfbGlnaHQgMCAmJiBlY2hvICLinIUg5oyH56S654Gv5bey5YWzIiB8fCBlY2hvICLinYwg5YWz54Gv5aSx6LSlIiA7OwogICAgICAqKSBlY2hvICLnlKjms5U6ICQwIGxpZ2h0IG9ufG9mZiIgOzsKICAgIGVzYWMgOzsKCiAgc3RhdHVzKQogICAgaXNfcnVubmluZyAmJiBlY2hvICLov5vnqIvvvJrov5DooYzkuK3vvIhQSUQgJChjYXQgIiRQSURGSUxFIinvvIkiIHx8IGVjaG8gIui/m+eoi++8muacqui/kOihjCIKICAgIGNoPSQocmVhZF9jaGFyZ2luZyk7IGx2PSQocmVhZF9saWdodCk7IGJ2PSQoZ2V0X2NtZCBiYXR0ZXJ5X3ZhbHVlIHwganNvbl9nZXQgYmF0dGVyeV92YWx1ZSkKICAgIGVjaG8gIuS+m+eUte+8miQoWyAiJGNoIiA9IDEgXSAmJiBlY2hvICflhYXnlLXkuK0v55u05L6b55S1JyB8fCB7IFsgIiRjaCIgPSAwIF0gJiYgZWNobyAn5pyq5YWF55S1JyB8fCBlY2hvICfor7vlj5blpLHotKUnOyB9KSIKICAgIGVjaG8gIuaMh+ekuueBr++8miQoWyAiJGx2IiA9IDEgXSAmJiBlY2hvIOW8gCB8fCB7IFsgIiRsdiIgPSAwIF0gJiYgZWNobyDlhbMgfHwgZWNobyDmnKrnn6U7IH0pICAgICDnlLXph4/vvJoke2J2Oi0/fSUiCiAgICBlY2hvICLorrDlvZXnirbmgIHvvJokKGNhdCAiJFNUQVRFIiAyPi9kZXYvbnVsbCB8fCBlY2hvICco5pegKScpIgogICAgZWNobyAi5byA5py66Ieq5ZCv77yaJChbIC1mICIkQVVUTyIgXSAmJiBlY2hvIOW3suWuieijhSB8fCBlY2hvIOacquWuieijhSkiCiAgICBlY2hvICItLS0g5pyA6L+RIDgg5p2h5pel5b+XIC0tLSI7IHRhaWwgLTggIiRMT0ciIDI+L2Rldi9udWxsIHx8IGVjaG8gIijml6Dml6Xlv5cpIiA7OwoKICBsb2cpIHRhaWwgLSIkezI6LTIwfSIgIiRMT0ciIDI+L2Rldi9udWxsIHx8IGVjaG8gIijml6Dml6Xlv5cpIiA7OwoKICBpbnN0YWxsKQogICAgbWtkaXIgLXAgIiQoZGlybmFtZSAiJEFVVE8iKSIKICAgIHByaW50ZiAnJXNcbicgJyMhL3N5c3RlbS9iaW4vc2gnIFwKICAgICAgJyMg55S15rqQ6IGU5Yqo5oyH56S654GvIMK3IE1hZ2lzayDlvIDmnLroh6rlkK/vvIhwb3dlcl9sZWQuc2ggaW5zdGFsbCDnlJ/miJDvvIknIFwKICAgICAgJ3NsZWVwIDQ1JyBcCiAgICAgICIkU0VMRiBzdGFydCIgPiIkQVVUTyIKICAgIGNobW9kIDc1NSAiJEFVVE8iOyBlY2hvICLinIUg5bey5a6J6KOF5byA5py66Ieq5ZCv77yaJEFVVE8iIDs7CgogIHVuaW5zdGFsbCkgcm0gLWYgIiRBVVRPIjsgZWNobyAi4pyFIOW3suenu+mZpOW8gOacuuiHquWQryIgOzsKCiAgcHVyZ2UpCiAgICAiJFNFTEYiIHN0b3AgPi9kZXYvbnVsbCAyPiYxCiAgICBybSAtZiAiJEFVVE8iCiAgICBybSAtZiAiJExPRyIgIiRTVEFURSIgIiRQSURGSUxFIgogICAgIyDnlKggZGV0YWNoIOeahOWtkCBzaGVsbCDliKDpmaTnm67lvZXmnKzouqvvvIjmraPlnKjmiafooYznmoTohJrmnKzooqvliKDkuZ/kuI3lvbHlk43vvIzlt7Igc3RvcO+8iQogICAgc2V0c2lkIC9zeXN0ZW0vYmluL3NoIC1jICJzbGVlcCAxOyBybSAtcmYgJyRESVInIiA+L2Rldi9udWxsIDI+JjEgJgogICAgZWNobyAi4pyFIOW3suW9u+W6leWNuOi9ve+8muWuiOaKpOWBnOatoiDCtyDoh6rlkK/np7vpmaQgwrcgJERJUiDlt7LliKDpmaQiIDs7CgogICopIHNlZCAtbiAnMiwyMnAnICIkU0VMRiIgOzsKZXNhYwo=';
  const LS_INT = 'power_led_interval';
  const LS_ENF = 'power_led_enforce';
  const LS_AUTO = 'power_led_autostart';
  const LS_REMOVED = 'power_led_removed';

  const shq = (s) => `'` + String(s).replace(/'/g, `'\\''`) + `'`;
  const sh = async (cmd, timeout = 30000) => {
    try {
      const r = await runShellWithRoot(cmd, timeout);
      if (r == null) return '';
      return typeof r === 'string' ? r : (r.content != null ? String(r.content) : JSON.stringify(r));
    } catch (e) { return 'ERR: ' + (e?.message || e); }
  };

  const getInterval = () => Math.max(3, Math.min(120, Number(localStorage.getItem(LS_INT) || 5)));
  const getEnforce = () => localStorage.getItem(LS_ENF) !== '0';   // 默认开启自愈
  const getAuto = () => localStorage.getItem(LS_AUTO) === '1';

  // ---------- 设备侧操作 ----------
  const deployed = async () => {
    const out = await sh(`test -f ${SCRIPT} && grep -c ${shq(VER)} ${SCRIPT} 2>/dev/null || echo 0`, 8000);
    return String(out).trim() !== '0';
  };
  const deploy = async () => {
    await sh(`mkdir -p ${DIR}`, 8000);
    await sh(`printf '%s' ${shq(B64)} | base64 -d > ${SCRIPT} && chmod 755 ${SCRIPT}`, 20000);
    return deployed();
  };
  const ctl = (args, t = 40000) => sh(`/system/bin/sh ${SCRIPT} ${args}`, t);
  // 启动必须显式带上间隔与自愈开关（脚本在 start 时读取）
  const startCmd = () => `INTERVAL=${getInterval()} ENFORCE=${getEnforce()} /system/bin/sh ${SCRIPT} start`;
  const ensureDeployed = async () => (await deployed()) || (await deploy());

  const readStatus = async () => {
    const s = await ctl('status', 25000);
    const pick = (re) => { const m = String(s).match(re); return m ? m[1].trim() : '—'; };
    return {
      raw: String(s),
      running: /进程：运行中/.test(s),
      power: pick(/供电：(\S+)/),
      light: pick(/指示灯：(\S+?)\s/),
      battery: pick(/电量：(\d+)%/),
      auto: /开机自启：已安装/.test(s),
      err: /^ERR:/.test(String(s).trim()),
    };
  };

  // ---------- 面板 ----------
  const openModal = async () => {
    if (typeof runShellWithRoot !== 'function') return createToast('需要开启高级功能（root shell）', 'red');
    const isRoot = String(await sh('whoami', 8000)).includes('root');
    if (!isRoot) return createToast('需要开启高级功能（root shell）', 'red');

    document.querySelector('#power_led_modal2')?.remove();

    const { id, el } = createModal({
      name: 'power_led_modal2',
      title: '电源联动指示灯（设备端）',
      maxWidth: '470px',
      showConfirm: false,
      onClose: () => true,
      content: `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,.04);line-height:1.9;font-size:.72rem;">
            <div>运行状态：<span id="pl2_run">读取中…</span></div>
            <div>供电状态：<span id="pl2_power">…</span></div>
            <div>指示灯：<span id="pl2_light">…</span>　　电量：<span id="pl2_bat">…</span></div>
            <div>开机自启：<span id="pl2_auto">…</span>　　轮询间隔：<span id="pl2_int">…</span> 秒</div>
          </div>

          <div id="pl2_switch"></div>

          <div>
            <div class="title" style="font-size:.78rem;margin-bottom:8px;">操作</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button id="pl2_once">立即执行一次</button>
              <button id="pl2_force">强制写一次</button>
              <button id="pl2_deploy">重新部署脚本</button>
              <button id="pl2_autoon">装开机自启</button>
              <button id="pl2_autooff">卸开机自启</button>
              <button id="pl2_logbtn">查看日志</button>
            </div>
          </div>

          <div>
            <div class="title" style="font-size:.78rem;margin-bottom:8px;">轮询间隔（秒，改动后自动重启）</div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input id="pl2_int_input" type="number" min="3" max="120" value="${getInterval()}"
                     style="width:90px;padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.15);background:transparent;color:inherit;">
              <button id="pl2_int_save">保存并应用</button>
            </div>
            <label style="display:block;margin-top:8px;font-size:.7rem;">
              <input type="checkbox" id="pl2_enf" ${getEnforce() ? 'checked' : ''}> 强制保持联动（灯被手动改动或其它插件改动后自动纠正）
            </label>
          </div>

          <pre id="pl2_log" style="display:none;max-height:220px;overflow:auto;font-size:.68rem;line-height:1.5;background:rgba(0,0,0,.25);padding:8px;border-radius:8px;white-space:pre-wrap;"></pre>

          <div style="border-top:1px solid rgba(255,255,255,.1);padding-top:10px;">
            <div class="title" style="font-size:.78rem;margin-bottom:8px;color:#ff6b6b;">卸载</div>
            <div style="font-size:.7rem;line-height:2;">
              <label style="display:block;"><input type="checkbox" id="pl2_u_light" checked> 卸载前把指示灯恢复为「开」</label>
              <label style="display:block;"><input type="checkbox" id="pl2_u_auto" checked> 移除 Magisk 开机自启</label>
              <label style="display:block;"><input type="checkbox" id="pl2_u_del" checked> 删除 /data/power_led（脚本 / 日志 / 状态 / PID）</label>
            </div>
            <div style="margin-top:8px;">
              <button id="pl2_uninstall" style="border-color:#ff6b6b;color:#ff6b6b;">执行卸载</button>
            </div>
            <div style="font-size:.64rem;opacity:.6;margin-top:6px;">
              卸载只清理设备上的东西；插件条目本身请到「插件」里删除。卸载后可再次打开开关重新部署。
            </div>
          </div>

          <div style="font-size:.66rem;opacity:.65;line-height:1.6;">
            💡 脚本运行在设备上：关掉网页/浏览器仍然生效；已装 Magisk 自启的话重启也会自动恢复。
            只控制指示灯，不改充电策略。
          </div>
        </div>`,
    });

    const q = (s) => el.querySelector(s);
    const refresh = async () => {
      const st = await readStatus();
      q('#pl2_run').textContent = st.err ? '读取失败（脚本未部署？）' : (st.running ? '运行中 ✅' : '未运行');
      q('#pl2_run').style.color = st.running ? 'var(--dark-btn-color-active)' : '#ff6b6b';
      q('#pl2_power').textContent = st.power;
      q('#pl2_light').textContent = st.light;
      q('#pl2_bat').textContent = st.battery === '—' ? '—' : st.battery + '%';
      q('#pl2_auto').textContent = st.auto ? '已安装' : '未安装';
      q('#pl2_int').textContent = getInterval();
      if (autoSwitch?.querySelector('input')) autoSwitch.querySelector('input').checked = st.running;
      if (q('#pl2_log').style.display !== 'none') q('#pl2_log').textContent = await ctl('log 30', 15000);
    };

    // 开关：开启=部署+启动，关闭=停止
    const autoSwitch = createSwitch({
      text: '启用设备端联动（充电关灯 / 断充开灯）',
      value: false,
      onChange: async (checked) => {
        if (checked) {
          createToast('正在部署并启动…', '', 1500);
          if (!(await ensureDeployed())) return createToast('部署失败，检查高级功能', 'red');
          const out = await sh(startCmd());
          if (/已启动/.test(out)) { localStorage.removeItem(LS_REMOVED); updateBtnLabel(); }
          createToast(/已启动/.test(out) ? '已启动设备端联动' : ('启动返回：' + out.slice(0, 60)), /已启动/.test(out) ? 'green' : 'red');
        } else {
          const out = await ctl('stop');
          createToast(/已停止|未在运行/.test(out) ? '已停止联动' : ('停止返回：' + out.slice(0, 60)), 'pink');
        }
        refresh();
      },
    });
    q('#pl2_switch').appendChild(autoSwitch);

    q('#pl2_once').onclick  = async () => { if (!(await ensureDeployed())) return createToast('未部署', 'red'); createToast((await ctl('once')).trim().slice(0, 60), ''); refresh(); };
    q('#pl2_force').onclick = async () => { if (!(await ensureDeployed())) return createToast('未部署', 'red'); createToast((await ctl('force')).trim().slice(0, 60), ''); refresh(); };
    q('#pl2_deploy').onclick = async () => { createToast((await deploy()) ? '脚本已重新部署' : '部署失败', (await deployed()) ? 'green' : 'red'); refresh(); };
    q('#pl2_autoon').onclick = async () => { createToast((await ctl('install')).trim().slice(0, 60), 'green'); refresh(); };
    q('#pl2_autooff').onclick = async () => { createToast((await ctl('uninstall')).trim().slice(0, 60), 'pink'); refresh(); };
    q('#pl2_logbtn').onclick = async () => {
      const pre = q('#pl2_log');
      if (pre.style.display === 'none') { pre.style.display = 'block'; pre.textContent = await ctl('log 30', 15000); }
      else pre.style.display = 'none';
    };
    q('#pl2_int_save').onclick = async () => {
      const v = Math.max(3, Math.min(120, Number(q('#pl2_int_input').value) || 5));
      localStorage.setItem(LS_INT, String(v));
      localStorage.setItem(LS_ENF, q('#pl2_enf').checked ? '1' : '0');
      const st = await readStatus();
      if (st.running) { await ctl('stop'); await sh(startCmd()); }
      createToast(`间隔 ${v} 秒 · 自愈${q('#pl2_enf').checked ? '开' : '关'}` + (st.running ? '，已重启联动' : ''), 'green');
      refresh();
    };

    // ---------- 卸载 ----------
    q('#pl2_uninstall').onclick = async () => {
      const restore = q('#pl2_u_light').checked;
      const rmAuto  = q('#pl2_u_auto').checked;
      const rmDir   = q('#pl2_u_del').checked;
      const lines = [
        restore ? '· 卸载前把指示灯恢复为「开」' : '',
        rmAuto  ? '· 移除 Magisk 开机自启' : '',
        rmDir   ? '· 删除 /data/power_led（脚本/日志/状态）' : '',
      ].filter(Boolean).join('\n') || '· （未勾选任何清理项，仅停止联动）';
      if (!confirm(`确认卸载「电源联动指示灯（设备端）」？\n\n${lines}\n\n卸载后如需彻底移除插件，请到「插件」里删除本条。`)) return;

      createToast('正在卸载…', '', 2000);
      if (restore) await ctl('light on', 25000);          // 先恢复灯（需要脚本还在）
      if (rmDir) {
        await ctl('purge', 30000);                        // 停进程 + 删自启 + 删目录
      } else {
        await ctl('stop', 20000);
        if (rmAuto) await ctl('uninstall', 15000);
      }
      localStorage.setItem(LS_REMOVED, '1');
      updateBtnLabel();
      createToast('已卸载设备端联动（插件条目请到插件列表删除）', 'green', 4000);
      refresh();
    };

    showModal(id);
    refresh();
  };

  // ---------- 主按钮 ----------
  const btn = document.createElement('button');
  btn.className = 'btn';
  const updateBtnLabel = () => {
    const removed = localStorage.getItem(LS_REMOVED) === '1';
    btn.textContent = removed ? '电源联动指示灯（已卸载）' : '电源联动指示灯';
    btn.title = removed ? '设备端联动已卸载；打开面板可重新部署' : '设备端电源联动控制面板';
  };
  updateBtnLabel();
  btn.onclick = openModal;
  (document.querySelector('.actions-buttons') || document.querySelector('#collapse_box') || document.body).appendChild(btn);
})();
</script>
<!-- [KANO_PLUGIN_END] 【电源联动指示灯】设备端常驻版.js -->
