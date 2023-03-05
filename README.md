# Obsidian MSG and EML Handler Plugin

Obsidian by default doesn't open any **Outlook** (`.msg`, `.eml`) files. It will prompt you to open the file in your OS's default application. This plugin is created to **Display** and **Easily Search** for Outlook items you save within your folder.

Most companies have a retention policy when it comes to emails (like 2, or 3 years). It might be even shorter. You will need to save your important emails on your computer. Or you might want to save and search only for particular Outlook messages even if you don't have any retention policy. This plugin comes in handy for such people to easily find relevant items and open them.

The plugin basically adds a custom view to handle files with `.msg` and `.eml` extensions. There is an additional **Search View** created to find what you are searching for easily. It looks very identical to Obsidian's default searcher since it is using the same style classes to make it easier for users to use at any time.

To make the search functionality faster, the plugin observes your vault changes when it comes to `.msg` and `.eml` files and indexes them within a database so that it doesn't need to go back to the file and read it for each search. After each vault open/plugin load, the plugin will cross check all `.msg` and `.eml` files within your vault vs the database and make the necessary updates just in case you brought some of the the `.msg` or `.eml` files when the plugin was not turned on or your vault was not open.

In the plugin msg file view, you will have 3 sections:

-   **Header**: Includes information like sender name, sender email, recipients name and email, subject
-   **Body** : Includes the plain text version of email body
-   **Attachments**: Includes the attachments of the email. The plugin will render the images and hide them automatically by using a toggle button. You can toggle to see them. If the file is not an image, you can save the file in your vault in any folder you want. The plugin will prompt you to select the folder to save.

## View Messages in Editor Source Mode

You can install **Ozan's Image in Editor** plugin to view the embedded preview of your `.msg` or `.eml` files directly from the editor using WikiLinks:

```md
![[MyMessageFromOutlook.msg]]
![[AnotherMessageToSee.eml]]
```

Make sure that you enable rendering msg files from the **Ozan's Image in Editor** plugin settings.

## View Messages in Preview Mode

The plugin by default supports the preview of embedded images in Obsidian's Preview Mode. If you are using Editor Source Mode combined with Preview mode, your embedded messages are always going to be displayed along with your markdown note. Same like Editor Source Mode, use the Wikilink format.

## Contact

If you have any issue or you have any suggestion, please feel free to reach me out directly using contact page of my website [ozan.pl/contact/](https://www.ozan.pl/contact/) or directly to <me@ozan.pl>.

## Support

If you are enjoying the plugin then you can support my work and enthusiasm by buying me a coffee:

<a href='https://ko-fi.com/L3L356V6Q' target='_blank'>
    <img height='48' style='border:0px;height:48px;' src='https://cdn.ko-fi.com/cdn/kofi1.png?v=2' border='0' alt='Buy Me a Coffee at ko-fi.com' />
</a>
