import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a user from the server")
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("The user to ban")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("Reason for the ban"),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    category: "moderation",

    async execute(interaction, config, client) {
        const user = interaction.options.getUser("target");
        const reason = interaction.options.getString("reason") || "No reason provided";

        if (!user) {
            throw new TitanBotError(
                'Missing target user',
                ErrorTypes.USER_INPUT,
                'You must specify a user to ban.',
                { subtype: 'invalid_user' },
            );
        }

        if (user.id === interaction.user.id) {
            throw new TitanBotError(
                'Cannot ban self',
                ErrorTypes.VALIDATION,
                'You cannot ban yourself.',
            );
        }
                /        // Send ban DM before the ban executes (user must share a guild to receive it)
        if (config.banDM?.enabled) {
            const dmMessage = config.banDM.defaultBanMessage
                .replace("{user}", user.username)
                .replace("{server}", interaction.guild.name)
                .replace("{reason}", reason)
                .replace("{moderator}", interaction.user.tag);

            try {
                const dmChannel = await user.createDM();
                await dmChannel.send({ content: dmMessage });
            } catch (err) {
                if (err.code === 50007) {
                    logger.warn(`Could not DM ${user.tag}: DMs disabled`);
                } else {
                    logger.warn(`Could not DM ${user.tag}: ${err.message}`);
                }
            }
        }


            try {
                await user.send(dmMessage);
            } catch (err) {
                console.warn(`Could not DM ${user.tag}: ${err.message}`);
            }
        }


        if (user.id === client.user.id) {
            throw new TitanBotError(
                'Cannot ban bot',
                ErrorTypes.VALIDATION,
                'You cannot ban the bot.',
            );
        }

        const result = await ModerationService.banUser({
            guild: interaction.guild,
            user,
            moderator: interaction.member,
            reason,
        });

        await InteractionHelper.universalReply(interaction, {
            embeds: [
                successEmbed(
                    `🚫 **Banned** ${user.tag}`,
                    `**Reason:** ${reason}\n**Case ID:** #${result.caseId}`,
                ),
            ],
        });
    },
};
